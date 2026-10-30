"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "../../utils/supabase/client";

const supabase = createClient();
const plans = [
  { name: "Free", monthly: 0, annual: 0, description: "Explore BusinessIQ with the essentials.", features: ["One business workspace", "Core transaction tracking", "Essential performance overview", "CSV export"], featured: false },
  { name: "Starter", monthly: 23000, annual: 230000, description: "For individuals and small businesses getting organised.", features: ["Everything in Free", "Expanded transaction history", "Sales category insights", "Business performance trends", "Priority email support"], featured: false },
  { name: "Professional", monthly: 30000, annual: 300000, description: "For growing teams that need deeper visibility.", features: ["Everything in Starter", "Advanced sales analytics", "Customer segment reporting", "Geographic analytics", "More workspace capacity"], featured: true },
  { name: "Business", monthly: 45000, annual: 450000, description: "For established teams managing more complex operations.", features: ["Everything in Professional", "Multi-workspace workflows", "Advanced reporting tools", "Team collaboration controls", "Priority support"], featured: false },
];
const formatNaira = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

export default function PricingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) { setUserId(data.user?.id ?? null); setLoading(false); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setLoading(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  function subscribe(plan: string) {
    if (plan === "Free") { router.push(userId ? "/" : "/login?next=/"); return; }
    const next = `/billing/checkout?plan=${encodeURIComponent(plan.toLowerCase())}&interval=${annual ? "year" : "month"}`;
    if (!userId) { router.push(`/login?next=${encodeURIComponent(next)}`); return; }
    router.push(next);
  }

  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>PLANS &amp; BILLING</small></span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link></header>
    <div className="tool-content">
      <div className="tool-eyebrow"><CreditCard size={15}/> BUSINESSIQ PLANS</div>
      <h1>Choose the right plan for your business.</h1>
      <p className="tool-intro">Transparent plans for businesses at every stage. Choose monthly or annual billing.</p>
      <div className="billing-interval-switch" role="group" aria-label="Billing interval">
        <button className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>Monthly</button>
        <button className={annual ? "active" : ""} onClick={() => setAnnual(true)}>Yearly <span>2 months free</span></button>
      </div>
      <div className="customer-pricing-grid">{plans.map(plan => <article key={plan.name} className={plan.featured ? "customer-plan featured" : "customer-plan"}>{plan.featured && <span className="customer-plan-badge"><Sparkles size={13}/> MOST POPULAR</span>}<h2>{plan.name}</h2><p>{plan.description}</p><div className="customer-plan-price">{formatNaira(annual ? plan.annual : plan.monthly)}<small> / {plan.name === "Free" ? "forever" : annual ? "year" : "month"}</small></div>{annual && plan.name !== "Free" && <p className="annual-equivalent">{formatNaira(Math.round(plan.annual / 12))} per month, billed annually</p>}<ul>{plan.features.map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul><button disabled={loading} className={plan.name === "Free" ? "subtle-btn customer-plan-cta" : "primary-btn customer-plan-cta"} onClick={() => subscribe(plan.name)}>{loading ? "Checking account…" : plan.name === "Free" ? "Get started free" : userId ? "Continue to secure checkout" : "Subscribe"}</button><small className="customer-plan-note">{plan.name === "Free" ? "No payment details required" : userId ? "Continue without signing in again" : "Secure account required before payment"}</small></article>)}</div>
      <section className="pricing-faq"><h2>Secure subscriptions</h2><p>Payments will be processed by supported payment providers. BusinessIQ will activate paid features only after a verified payment confirmation. Customers will be able to manage renewals, invoices and cancellations from their billing area.</p><p>Need an enterprise arrangement? <a href="mailto:hello@businessiq.app">Contact the BusinessIQ team</a>.</p></section>
    </div>
  </main>;
}
