import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getNeonPool } from "@/utils/neon";

export const BUSINESSIQ_PRICES = {
  professional: { monthly: 23000, annual: 230000 },
  business: { monthly: 45000, annual: 450000 },
} as const;

export type PaidPlanCode = keyof typeof BUSINESSIQ_PRICES;
export type BillingInterval = "monthly" | "annual";

type PaystackTransaction = {
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  id?: number | string;
  channel?: string;
  paid_at?: string | null;
  gateway_response?: string;
  customer?: { customer_code?: string };
};

function getSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !/^sk_(test|live)_/.test(secret)) {
    throw new Error("Paystack is not configured. Add a valid server-side Paystack secret key.");
  }
  return secret;
}

export function makePaymentReference() {
  return "BIZIQ" + randomUUID().replaceAll("-", "").toUpperCase();
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", getSecret()).update(rawBody).digest("hex");
  const providedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function confirmAndActivatePayment(reference: string) {
  const db = getNeonPool();
  const existing = await db.query(
    "select reference,amount_minor,currency from bi_payment_attempts where reference=$1",
    [reference],
  );
  if (!existing.rowCount) throw new Error("This payment reference was not found.");

  const response = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), {
    method: "GET",
    headers: { Authorization: "Bearer " + getSecret(), "Cache-Control": "no-cache" },
    cache: "no-store",
  });
  const payload = await response.json() as { status?: boolean; message?: string; data?: PaystackTransaction };
  if (!response.ok || !payload.status || !payload.data) {
    throw new Error(payload.message || "Paystack could not verify this payment yet.");
  }

  const payment = payload.data;
  if (payment.status !== "success") {
    if (payment.status === "failed" || payment.status === "abandoned") {
      await db.query(
        "update bi_payment_attempts set status=$2,raw_verification=$3::jsonb,updated_at=now() where reference=$1 and status='initialized'",
        [reference, payment.status, JSON.stringify({ status: payment.status, gateway_response: payment.gateway_response ?? null })],
      );
    }
    return { status: payment.status || "pending", activated: false };
  }

  const client = await db.connect();
  try {
    await client.query("begin");
    const locked = await client.query(
      "select * from bi_payment_attempts where reference=$1 for update",
      [reference],
    );
    const attempt = locked.rows[0];
    if (!attempt) throw new Error("This payment reference was not found.");
    if (attempt.status === "success" && attempt.subscription_id) {
      await client.query("commit");
      return { status: "success", activated: true, alreadyActivated: true, plan: attempt.plan_code };
    }

    const paidAmount = Number(payment.amount);
    if (
      payment.reference !== reference ||
      payment.currency !== attempt.currency ||
      paidAmount !== Number(attempt.amount_minor)
    ) {
      await client.query(
        "update bi_payment_attempts set status='failed',raw_verification=$2::jsonb,updated_at=now() where id=$1",
        [attempt.id, JSON.stringify({ status: payment.status, amount: paidAmount, currency: payment.currency, reference: payment.reference, verification_mismatch: true })],
      );
      await client.query("commit");
      return { status: "verification_mismatch", activated: false };
    }

    const org = await client.query("select id from bi_organizations where id=$1 for update", [attempt.organization_id]);
    if (!org.rowCount) throw new Error("The workspace linked to this payment no longer exists.");

    await client.query(
      "update bi_subscriptions set status='cancelled',updated_at=now() where organization_id=$1 and status='active'",
      [attempt.organization_id],
    );
    const subscription = await client.query(
      `insert into bi_subscriptions
        (organization_id,plan_code,billing_interval,amount_minor,currency,status,starts_at,ends_at,paystack_customer_code)
       values ($1,$2,$3,$4,'NGN','active',now(),
         case when $3='monthly' then now() + interval '1 month' else now() + interval '1 year' end,$5)
       returning id`,
      [attempt.organization_id, attempt.plan_code, attempt.billing_interval, attempt.amount_minor, payment.customer?.customer_code ?? null],
    );

    await client.query(
      "update bi_organizations set plan=$2,updated_at=now() where id=$1",
      [attempt.organization_id, attempt.plan_code === "professional" ? "Professional" : "Business"],
    );
    await client.query(
      `update bi_payment_attempts
       set status='success',subscription_id=$2,provider_transaction_id=$3,verified_at=now(),
           raw_verification=$4::jsonb,updated_at=now()
       where id=$1`,
      [attempt.id, subscription.rows[0].id, String(payment.id ?? ""), JSON.stringify({
        status: payment.status,
        amount: paidAmount,
        currency: payment.currency,
        channel: payment.channel ?? null,
        paid_at: payment.paid_at ?? null,
        gateway_response: payment.gateway_response ?? null,
        customer_code: payment.customer?.customer_code ?? null,
      })],
    );
    await client.query(
      `insert into bi_audit_logs(organization_id,actor_id,action,entity,detail)
       values($1,$2,'subscription.payment_verified','subscription',$3::jsonb)`,
      [attempt.organization_id, attempt.user_id, JSON.stringify({
        plan: attempt.plan_code,
        billing_interval: attempt.billing_interval,
        amount_minor: attempt.amount_minor,
        reference,
        subscription_id: subscription.rows[0].id,
      })],
    );
    await client.query("commit");
    return { status: "success", activated: true, plan: attempt.plan_code };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
