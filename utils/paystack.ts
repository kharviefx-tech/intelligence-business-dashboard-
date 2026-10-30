const PAYSTACK_API = "https://api.paystack.co";

export function getPaystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !secret.startsWith("sk_")) {
    throw new Error("Paystack secret key is missing or invalid. Configure PAYSTACK_SECRET_KEY in Vercel.");
  }
  return secret;
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${getPaystackSecret()}`, Accept: "application/json" },
    cache: "no-store",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status || !result?.data) {
    throw new Error(result?.message || "Paystack could not verify this transaction.");
  }
  return result.data as {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer?: { email?: string };
    paid_at?: string;
  };
}
