import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { createAdminClient } from "../../../../utils/supabase/admin";
import { getPaystackSecret } from "../../../../utils/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICES: Record<string, { month: number; year: number }> = {
  Starter: { month: 23000, year: 230000 },
  Professional: { month: 30000, year: 300000 },
  Business: { month: 45000, year: 450000 },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({ error: "Please sign in before subscribing." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const plan = typeof body?.plan === "string" ? body.plan : "";
    const interval = body?.interval === "year" ? "year" : body?.interval === "month" ? "month" : "";
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
    if (!PRICES[plan] || !interval || !organizationId) {
      return NextResponse.json({ error: "Choose a valid plan, billing interval and workspace." }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("bi_organization_members")
      .select("organization_id,role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError || !membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Only the workspace owner can purchase or change its plan." }, { status: 403 });
    }

    const amountNaira = PRICES[plan][interval];
    const amountKobo = amountNaira * 100;
    const reference = `biq_${randomUUID().replaceAll("-", "")}`;
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const callbackUrl = new URL("/api/billing/verify", origin).toString();

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getPaystackSecret()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: {
          product: "BusinessIQ",
          user_id: user.id,
          organization_id: organizationId,
          plan,
          billing_interval: interval,
          custom_fields: [
            { display_name: "BusinessIQ plan", variable_name: "businessiq_plan", value: plan },
            { display_name: "Billing interval", variable_name: "billing_interval", value: interval },
          ],
        },
      }),
      cache: "no-store",
    });
    const initialized = await paystackResponse.json().catch(() => null);
    if (!paystackResponse.ok || !initialized?.status || !initialized?.data?.authorization_url) {
      return NextResponse.json({ error: initialized?.message || "Paystack could not start checkout. Please try again." }, { status: 502 });
    }

    const admin = createAdminClient();
    const { error: insertError } = await admin.from("bi_payment_attempts").insert({
      user_id: user.id,
      organization_id: organizationId,
      reference,
      plan,
      billing_interval: interval,
      amount_kobo: amountKobo,
      currency: "NGN",
      status: "initialized",
      authorization_url: initialized.data.authorization_url,
    });
    if (insertError) {
      return NextResponse.json({ error: "Checkout was created but could not be safely recorded. Please contact support before retrying." }, { status: 500 });
    }

    return NextResponse.json({ authorizationUrl: initialized.data.authorization_url, reference });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start secure checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
