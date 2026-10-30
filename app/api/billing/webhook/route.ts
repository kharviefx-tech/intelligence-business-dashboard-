import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../utils/supabase/admin";
import { getPaystackSecret, verifyPaystackTransaction } from "../../../../utils/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  try {
    const expected = createHmac("sha512", getPaystackSecret()).update(rawBody).digest("hex");
    const suppliedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event?.event !== "charge.success" || !event?.data?.reference) {
      return NextResponse.json({ received: true });
    }
    const reference = String(event.data.reference);
    if (!/^biq_[a-f0-9]{32}$/i.test(reference)) return NextResponse.json({ received: true });

    const admin = createAdminClient();
    const { data: attempt, error } = await admin
      .from("bi_payment_attempts")
      .select("reference,user_id,amount_kobo,currency,status")
      .eq("reference", reference)
      .maybeSingle();
    if (error) throw error;
    if (!attempt || attempt.status === "paid") return NextResponse.json({ received: true });

    const { data: authData, error: userError } = await admin.auth.admin.getUserById(attempt.user_id);
    if (userError || !authData.user?.email) throw new Error("Could not resolve the BusinessIQ account for this payment.");

    const payment = await verifyPaystackTransaction(reference);
    if (payment.status !== "success" || payment.reference !== reference ||
        payment.amount !== Number(attempt.amount_kobo) || payment.currency !== attempt.currency ||
        (payment.customer?.email || "").toLowerCase() !== authData.user.email.toLowerCase()) {
      return NextResponse.json({ error: "Payment verification did not match the stored checkout." }, { status: 400 });
    }

    const { error: activationError } = await admin.rpc("bi_activate_subscription_from_verified_payment", {
      p_reference: reference,
    });
    if (activationError) throw activationError;
    return NextResponse.json({ received: true, activated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
