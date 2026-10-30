import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { createAdminClient } from "../../../../utils/supabase/admin";
import { verifyPaystackTransaction } from "../../../../utils/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resultRedirect(request: NextRequest, status: "success" | "failed", message: string, plan?: string) {
  const url = new URL("/billing/result", request.nextUrl.origin);
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);
  if (plan) url.searchParams.set("plan", plan);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") || request.nextUrl.searchParams.get("trxref");
  if (!reference || !/^biq_[a-f0-9]{32}$/i.test(reference)) {
    return resultRedirect(request, "failed", "The payment reference is missing or invalid.");
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !user.email) {
      return resultRedirect(request, "failed", "Sign in to the same BusinessIQ account used to start this payment.");
    }

    const admin = createAdminClient();
    const { data: attempt, error: attemptError } = await admin
      .from("bi_payment_attempts")
      .select("reference,user_id,organization_id,plan,billing_interval,amount_kobo,currency,status")
      .eq("reference", reference)
      .eq("user_id", user.id)
      .maybeSingle();
    if (attemptError || !attempt) {
      return resultRedirect(request, "failed", "We could not match this payment to your account.");
    }
    if (attempt.status === "paid") {
      return resultRedirect(request, "success", "Your payment has already been confirmed.", attempt.plan);
    }

    const payment = await verifyPaystackTransaction(reference);
    if (payment.reference !== reference || payment.status !== "success" ||
        payment.amount !== Number(attempt.amount_kobo) || payment.currency !== attempt.currency ||
        (payment.customer?.email || "").toLowerCase() !== user.email.toLowerCase()) {
      return resultRedirect(request, "failed", "Paystack did not confirm the expected amount and account. No paid access was activated.");
    }

    const { data: activation, error: activationError } = await admin.rpc("bi_activate_subscription_from_verified_payment", {
      p_reference: reference,
    });
    if (activationError) throw activationError;

    return resultRedirect(request, "success", "Payment verified. Your workspace plan is now active.", String(activation?.plan || attempt.plan));
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not verify this payment.";
    return resultRedirect(request, "failed", message);
  }
}
