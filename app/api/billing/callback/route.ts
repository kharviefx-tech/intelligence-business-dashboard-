import { NextRequest, NextResponse } from "next/server";
import { confirmAndActivatePayment } from "@/utils/paystack-billing";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") || "";
  const destination = new URL("/subscription", request.url);
  if (!/^[A-Za-z0-9.=\-_]{12,100}$/.test(reference)) {
    destination.searchParams.set("payment", "invalid");
    return NextResponse.redirect(destination);
  }
  try {
    const result = await confirmAndActivatePayment(reference);
    const paymentState = result.activated ? "success" : result.status === "verification_mismatch" ? "review" : ["failed", "abandoned"].includes(result.status) ? "failed" : "pending";
    destination.searchParams.set("payment", paymentState);
    if (result.plan) destination.searchParams.set("plan", result.plan);
    if (paymentState === "pending") destination.searchParams.set("reference", reference);
  } catch (error) {
    console.error("BusinessIQ Paystack callback verification failed", error);
    destination.searchParams.set("payment", "pending");
  }
  return NextResponse.redirect(destination);
}
