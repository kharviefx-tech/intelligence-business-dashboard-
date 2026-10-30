import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, CreditCard } from "lucide-react";
import { createClient } from "../../../utils/supabase/server";

const plans: Record<string, { label: string; monthly: number; annual: number }> = {
  starter: { label: "Starter", monthly: 23000, annual: 230000 },
  professional: { label: "Professional", monthly: 30000, annual: 300000 },
  business: { label: "Business", monthly: 45000, annual: 450000 },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string; interval?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  const plan = plans[(params.plan || "").toLowerCase()];
  const interval = params.interval === "year" ? "year" : "month";
  if (!user) redirect(`/login?next=${encodeURIComponent(`/billing/checkout?plan=${params.plan || ""}&interval=${interval}`)}`);

  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>SECURE CHECKOUT</small></span></Link><Link href="/pricing" className="back-link"><ArrowLeft size={16}/> Back to plans</Link></header>
    <div className="tool-content billing-checkout-content">
      <div className="tool-eyebrow"><CreditCard size={15}/> SUBSCRIPTION CHECKOUT</div>
      <h1>{plan ? `Your ${plan.label} subscription` : "Select a valid subscription plan"}</h1>
      {plan ? <><div className="billing-order-card"><div><span>Selected plan</span><strong>{plan.label}</strong></div><div><span>Billing interval</span><strong>{interval === "year" ? "Annual" : "Monthly"}</strong></div><div><span>Amount</span><strong>₦{(interval === "year" ? plan.annual : plan.monthly).toLocaleString("en-NG")} / {interval}</strong></div><div><span>Account</span><strong>{user.email}</strong></div></div><div className="tool-warning monetization-warning"><ShieldCheck size={19}/><div><strong>Payment processing is not connected yet.</strong><p>Your plan and account are recognised, but BusinessIQ cannot safely accept payment until the Nigerian payment provider account, API credentials, signed webhooks and subscription access checks are configured. No payment has been taken and your plan has not been changed.</p></div></div><Link href="/pricing" className="primary-btn billing-back-plans">Return to plans</Link></> : <div className="tool-warning monetization-warning"><p>This checkout link is invalid. Return to the plans page and choose a plan.</p></div>}
    </div>
  </main>;
}
