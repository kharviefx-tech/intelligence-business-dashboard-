"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { createClient } from "../../utils/supabase/client";

const supabase = createClient();
const plans = [
  { name: "Free", monthly: 0, annual: 0, description: "Explore BusinessIQ with the essentials.", features: ["One business workspace", "Core transaction tracking", "Essential performance overview", "CSV export"], featured: false },
  { name: "Starter", monthly: 23000, annual: 230000, description: "For individuals and small businesses getting organised.", features: ["Everything in Free", "Expanded transaction history", "Sales category insights", "Business performance trends", "Priority email support"], featured: false },
  { name: "Professional", monthly: 30000, annual: 300000, description: "For growing teams that need deeper visibility.", features: ["Everything in Starter", "Advanced sales analytics", "Customer segment reporting", "Geographic analytics", "More workspace capacity"], featured: true },
  { name: "Business", monthly: 45000, annual: 450000, description: "For established teams managing more complex operations.", features: ["Everything in Professional", "Multi-workspace workflows", "Advanced reporting tools", "Team collaboration controls", "Priority support"], featured: false },
];
const formatNaira = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

type Organization = { id: string; name: string; plan: string };

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) {
        const { data: profile } = await supabase.from("bi_profiles").select("preferred_organization_id").eq("id", user.id).maybeSingle();
        const { data: orgs } = await supabase.from("bi_organizations").select("id,name,plan").order("created_at", { ascending: true });
        if (!active) return;
        const list = (orgs ?? []) as Organization[];
        setOrganizations(list);
        const preferred = profile?.preferred_organization_id;
        setOrganizationId(list.some(org => org.id === preferred) ? preferred : list[0]?.id ?? "");
      }
      setLoading(false);
    }
    void loadAccount();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) { setOrganizations([]); setOrganizationId(""); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function subscribe(plan: string) {
    if (plan === "Free") { window.location.assign("/"); return; }
    if (!userId) { window.location.assign("/login?next=%2Fpricing"); return; }
    if (!organizationId) { window.location.assign("/onboarding"); return; }
    setBusyPlan(plan);
    setError("");
    try {
      const response = await fetch("/api/billing/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: annual ? "year" : "month", organizationId }),
      });
      const result = await response.json();
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error || "Unable to open Paystack checkout.");
      window.location.assign(result.authorizationUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not start checkout. Please try again.");
      setBusyPlan("");
    }
  }

  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>PLANS &amp; BILLING</small></span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link></header>
    <div className="tool-content">
      <div className="tool-eyebrow"><CreditCard size={15}/> BUSINESSIQ PLANS</div>
      <h1>Choose the right plan for your business.</h1>
      <p className="tool-intro">Transparent plans for businesses at every stage. Choose monthly or annual billing.</p>
      {userId && organizations.length > 1 && <label className="auth-field" style={{maxWidth:420,marginBottom:18}}>Workspace to upgrade<select value={organizationId} onChange={e=>setOrganizationId(e.target.value)}>{organizations.map(org=><option key={org.id} value={org.id}>{org.name} · {org.plan}</option>)}</select></label>}
      {userId && !organizations.length && !loading && <div className="auth-info"><strong>Create a workspace first</strong><p>Your account needs a BusinessIQ workspace before a paid plan can be attached.</p><Link href="/onboarding">Create workspace →</Link></div>}
      <div className="billing-interval-switch" role="group" aria-label="Billing interval"><button className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>Monthly</button><button className={annual ? "active" : ""} onClick={() => setAnnual(true)}>Yearly <span>2 months free</span></button></div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <div className="customer-pricing-grid">{plans.map(plan => <article key={plan.name} className={plan.featured ? "customer-plan featured" : "customer-plan"}>{plan.featured && <span className="customer-plan-badge"><Sparkles size={13}/> MOST POPULAR</span>}<h2>{plan.name}</h2><p>{plan.description}</p><div className="customer-plan-price">{formatNaira(annual ? plan.annual : plan.monthly)}<small> / {plan.name === "Free" ? "forever" : annual ? "year" : "month"}</small></div>{annual && plan.name !== "Free" && <p className="annual-equivalent">{formatNaira(Math.round(plan.annual / 12))} per month, billed annually</p>}<ul>{plan.features.map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul><button disabled={loading || Boolean(busyPlan)} className={plan.name === "Free" ? "subtle-btn customer-plan-cta" : "primary-btn customer-plan-cta"} onClick={() => subscribe(plan.name)}>{busyPlan === plan.name ? "Opening secure checkout…" : loading ? "Checking account…" : plan.name === "Free" ? "Open free workspace" : userId ? "Continue to secure checkout" : "Sign in to subscribe"}</button><small className="customer-plan-note">{plan.name === "Free" ? "No payment details required" : userId ? "Secure Paystack checkout · verified activation" : "Sign in first, then continue directly to payment"}</small></article>)}</div>
      <section className="pricing-faq"><h2><ShieldCheck size={18}/> Secure subscriptions</h2><p>Payments are processed by Paystack. BusinessIQ activates a paid plan only after server-side verification of the transaction amount, currency, account and reference. Card details are handled by Paystack, not stored by BusinessIQ.</p><p>Need an enterprise arrangement? <a href="mailto:hello@businessiq.app">Contact the BusinessIQ team</a>.</p></section>
      <p className="tool-secondary-link"><Wallet size={16}/> Monthly and annual plans are prepaid terms. Customers renew manually before the displayed expiry date; automatic recurring billing is not enabled yet.</p>
    </div>
  </main>;
}
