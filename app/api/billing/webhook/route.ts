import { NextRequest, NextResponse } from "next/server";
import { confirmAndActivatePayment, verifyPaystackSignature } from "@/utils/paystack-billing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  try {
    if (!verifyPaystackSignature(rawBody, signature)) {
      return NextResponse.json({ received: false }, { status: 401 });
    }
    const event = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } };
    if (event.event === "charge.success" && event.data?.reference) {
      await confirmAndActivatePayment(event.data.reference);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("BusinessIQ Paystack webhook processing failed", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
