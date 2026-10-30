"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles, Building2, Crown } from "lucide-react";

type Workspace = { id: string; name: string; plan?: string };
type BillingCycle = "monthly" | "yearly";

const plans = [
  {
    name: "Free",
    description: "A simple starting point for individuals getting their business records in order.",
    monthly: 0,
    yearly: 0,
    billingNote: "Free forever",
    audience: "For getting started",
    features: ["Business workspace", "Transaction ledger", "Core business overview", "Explore the BusinessIQ experience"],
    action: "Start with Free",
    tone: "standard",
  },
  {
    name: "Professional",
    description: "More visibility and room to grow for owners who want a clearer picture of business performance.",
    monthly: 23000,
    yearly: 230000,
    billingNote: "Billed annually",
    audience: "For growing businesses",
    features: ["Everything in Free", "Expanded business reporting", "More room for day-to-day operations", "A stronger view of business performance"],
    action: "Choose Professional",
    tone: "featured",
  },
  {
    name: "Business",
    description: "A stronger operating plan for established businesses coordinating more activity and people.",
    monthly: 45000,
    yearly: 450000,
    billingNote: "Billed annually",
    audience: "For active teams",
    features: ["Everything in Professional", "Team-oriented operating workflows", "Higher operating capacity", "More support for day-to-day business oversight"],
    action: "Choose Business",
    tone: "standard",
  },
  {
    name: "Enterprise",
    description: "A tailored BusinessIQ engagement for organisations with complex structures and specific operational needs.",
    monthly: null,
    yearly: null,
    billingNote: "Tailored quotation",
    audience: "For larger organisations",
    features: ["Everything in Business, scoped to your organisation", "Tailored rollout and implementation planning", "Requirements-led workflow configuration", "Organisation-wide onboarding discussion", "Priority implementation coordination", "Custom commercial terms"],
    action: "Discuss Enterprise",
    tone: "enterprise",
  },
];

const formatNaira = (amount: number) => "₦" + amount.toLocaleString("en-NG");

export default function SubscriptionPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    let active = true;
    fetch("/api/workspaces", { cache: "no-store" })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load your current plan.");
        return data;
      })
      .then(data => { if (active) setWorkspaces(data.workspaces ?? []); })
      .catch(e => { if (active) setNotice(e instanceof Error ? e.message : "Could not load your current plan."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const currentPlan = workspaces[0]?.plan || "Free";

  return <main className="tool-page subscription-page">
    <header className="tool-topbar">
      <Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>PLANS &amp; BILLING</small></span></Link>
      <Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link>
    </header>
    <div className="tool-content subscription-content">
      <div className="tool-eyebrow"><CreditCard size={15}/> CUSTOMER SUBSCRIPTIONS</div>
      <h1>Plans that grow with your business</h1>
      <p className="tool-intro">Choose the level of business visibility and support that matches where your organisation is today.</p>

      <section className="tool-warning monetization-warning">
        <ShieldCheck size={19}/>
        <div><strong>Secure checkout is not active yet.</strong><p>These plans and prices are displayed for review. Paystack checkout and automatic plan activation will only be enabled after payment verification and subscription access controls have been tested. No payment will be taken from this page.</p></div>
      </section>

      <section className="tool-stat-grid">
        <article><span>Your current plan</span><strong>{loading ? "Loading…" : currentPlan}</strong><small>{workspaces.length ? workspaces.length + " workspace(s) linked to your account" : "No workspace found yet"}</small></article>
        <article><span>Billing status</span><strong>Not activated</strong><small>Secure checkout is being prepared</small></article>
        <article><span>Payment protection</span><strong>Server verified</strong><small>Plan access follows confirmed payment</small></article>
      </section>
      {notice && <p className="tool-footer-note" role="status">{notice}</p>}

      <div className="subscription-heading-row">
        <div><h2 className="tool-section-title">Choose your plan</h2><p>Compare the options, then select a billing period.</p></div>
        <div className="subscription-cycle" role="group" aria-label="Billing period">
          <button type="button" className={billingCycle === "monthly" ? "active" : ""} aria-pressed={billingCycle === "monthly"} onClick={() => setBillingCycle("monthly")}>Monthly</button>
          <button type="button" className={billingCycle === "yearly" ? "active" : ""} aria-pressed={billingCycle === "yearly"} onClick={() => setBillingCycle("yearly")}>Yearly <span>Save 2 months</span></button>
        </div>
      </div>

      <div className="subscription-plan-grid">
        {plans.map(plan => {
          const amount = billingCycle === "monthly" ? plan.monthly : plan.yearly;
          const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();
          return <article className={"subscription-plan-card subscription-plan-" + plan.tone} key={plan.name}>
            {plan.tone === "featured" && <span className="subscription-popular"><Sparkles size={12}/> MOST POPULAR</span>}
            {plan.tone === "enterprise" && <span className="subscription-enterprise-label"><Crown size={13}/> PREMIUM ORGANISATION PLAN</span>}
            <div className="subscription-plan-audience">{plan.audience}</div>
            <h3>{plan.name}</h3>
            <p>{plan.description}</p>
            <div className="subscription-price">
              {amount === null ? <><strong>Custom</strong><span>Pricing based on your requirements</span></> :
                amount === 0 ? <><strong>₦0</strong><span>{plan.billingNote}</span></> :
                <><strong>{formatNaira(amount)}</strong><span>{billingCycle === "monthly" ? "per month" : "per year · billed annually"}</span>{billingCycle === "yearly" && <small>Equivalent to {formatNaira(Math.round(amount / 12))} per month</small>}</>}
            </div>
            <ul>{plan.features.map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul>
            <button type="button" className={(plan.tone === "featured" || plan.tone === "enterprise" ? "primary-btn" : "subtle-btn") + " subscription-action"} onClick={() => setNotice(plan.name === "Enterprise" ? "Enterprise enquiries will be available when the consultation workflow is connected. No payment has been initiated." : isCurrent ? "This is your current plan." : "The " + plan.name + " " + billingCycle + " option is selected for review. Secure Paystack checkout is not active yet, so no payment has been initiated.")}>
              {isCurrent ? "Your current plan" : plan.action}
            </button>
            {plan.name === "Enterprise" && <small className="subscription-enterprise-foot">A fit for multi-team operations, tailored requirements and guided rollout.</small>}
          </article>;
        })}
      </div>

      <section className="subscription-enterprise-note">
        <div className="subscription-enterprise-icon"><Building2 size={19}/></div>
        <div><strong>Why choose Enterprise?</strong><p>Enterprise is for organisations that need a considered rollout rather than a one-size-fits-all subscription. We’ll scope the organisation’s teams, operating requirements, configuration and onboarding needs before preparing a tailored proposal. The scope and delivery commitments will be agreed before purchase.</p></div>
      </section>

      <p className="tool-footer-note"><strong>Billing transparency:</strong> Yearly subscriptions are billed once per year at the displayed amount. Enterprise pricing is quoted after a requirements discussion. Applicable taxes, final plan limits and renewal terms will be shown before any payment is requested. Your plan will not change until payment is verified by BusinessIQ.</p>
    </div>
  </main>;
}
