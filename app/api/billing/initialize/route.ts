import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";
import { BUSINESSIQ_PRICES, makePaymentReference, type BillingInterval, type PaidPlanCode } from "@/utils/paystack-billing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Please sign in before starting checkout." }, { status: 401 });
  if (!user.email) return NextResponse.json({ error: "Add an email address to your account before paying." }, { status: 400 });

  let body: { organizationId?: string; planCode?: string; billingInterval?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 }); }

  const planCode = body.planCode as PaidPlanCode;
  const interval = body.billingInterval as "monthly" | "yearly";
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  if (!organizationId || !(planCode in BUSINESSIQ_PRICES) || !["monthly", "yearly"].includes(interval)) {
    return NextResponse.json({ error: "Choose a valid workspace, plan and billing period." }, { status: 400 });
  }

  const amountNaira = BUSINESSIQ_PRICES[planCode][interval === "yearly" ? "annual" : "monthly"];
  const amountMinor = amountNaira * 100;
  const db = getNeonPool();
  const access = await db.query(
    "select o.id,o.name,m.role from bi_organizations o join bi_organization_members m on m.organization_id=o.id where o.id=$1 and m.user_id=$2",
    [organizationId, user.id],
  );
  if (!access.rowCount || access.rows[0].role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can change its subscription." }, { status: 403 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !/^sk_(test|live)_/.test(secret)) {
    return NextResponse.json({ error: "Secure payments are not configured yet. Please contact BusinessIQ support." }, { status: 503 });
  }

  const reference = makePaymentReference();
  const storedInterval: BillingInterval = interval === "yearly" ? "annual" : "monthly";
  await db.query(
    `insert into bi_payment_attempts
      (organization_id,user_id,provider,reference,plan_code,billing_interval,amount_minor,currency,status)
     values($1,$2,'paystack',$3,$4,$5,$6,'NGN','initialized')`,
    [organizationId, user.id, reference, planCode, storedInterval, amountMinor],
  );

  try {
    const origin = request.nextUrl.origin;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify({
        email: user.email,
        amount: String(amountMinor),
        currency: "NGN",
        reference,
        callback_url: origin + "/api/billing/callback",
        channels: ["card", "bank", "bank_transfer", "ussd", "qr"],
        metadata: {
          businessiq_user_id: user.id,
          organization_id: organizationId,
          plan_code: planCode,
          billing_interval: storedInterval,
          custom_fields: [
            { display_name: "Workspace", variable_name: "workspace", value: access.rows[0].name },
            { display_name: "BusinessIQ plan", variable_name: "plan", value: planCode },
          ],
        },
      }),
      cache: "no-store",
    });
    const payload = await response.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
    if (!response.ok || !payload.status || !payload.data?.authorization_url || payload.data.reference !== reference) {
      await db.query("update bi_payment_attempts set status='failed',updated_at=now() where reference=$1 and status='initialized'", [reference]);
      console.error("Paystack initialization rejected", { status: response.status, message: payload.message });
      return NextResponse.json({ error: "Paystack could not start checkout. Please try again." }, { status: 502 });
    }
    await db.query(
      "update bi_payment_attempts set authorization_url=$2,updated_at=now() where reference=$1",
      [reference, payload.data.authorization_url],
    );
    return NextResponse.json({ authorizationUrl: payload.data.authorization_url, reference });
  } catch (error) {
    await db.query("update bi_payment_attempts set status='failed',updated_at=now() where reference=$1 and status='initialized'", [reference]);
    console.error("BusinessIQ Paystack initialization failed", error);
    return NextResponse.json({ error: "We could not connect to Paystack. Please try again." }, { status: 502 });
  }
}
