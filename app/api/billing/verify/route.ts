import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/utils/authenticated-user";
import { getNeonPool } from "@/utils/neon";
import { confirmAndActivatePayment } from "@/utils/paystack-billing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Please sign in to check this payment." }, { status: 401 });
  let body: { reference?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid verification request." }, { status: 400 }); }
  const reference = typeof body.reference === "string" ? body.reference : "";
  if (!/^[A-Za-z0-9.=\-_]{12,100}$/.test(reference)) return NextResponse.json({ error: "Invalid payment reference." }, { status: 400 });
  const db = getNeonPool();
  const attempt = await db.query("select user_id from bi_payment_attempts where reference=$1", [reference]);
  if (!attempt.rowCount || attempt.rows[0].user_id !== user.id) return NextResponse.json({ error: "Payment reference not found for this account." }, { status: 404 });
  try {
    const result = await confirmAndActivatePayment(reference);
    return NextResponse.json(result);
  } catch (error) {
    console.error("BusinessIQ payment status check failed", error);
    return NextResponse.json({ error: "We could not verify this payment yet. Please try again shortly." }, { status: 502 });
  }
}
