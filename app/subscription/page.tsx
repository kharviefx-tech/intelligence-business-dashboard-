"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";

type Workspace = { id: string; name: string; plan?: string };
const plans = [
  { name: "Free", description: "Start organising your business records.", features: ["Business workspace", "Transaction ledger", "Core business overview"], action: "Current entry plan" },
  { name: "Professional", description: "For growing businesses that need more room to operate.", features: ["Everything in Free", "Higher usage allowance", "Expanded business reporting"], action: "Choose Professional", featured: true },
  { name: "Business", description: "For teams managing more complex operations.", features: ["Everything in Professional", "Team-oriented workflows", "Higher operating limits"], action: "Choose Business" },
  { name: "Enterprise", description: "For organisations with tailored requirements.", features: ["Custom requirements review", "Organisation-level planning", "Dedicated onboarding discussion"], action: "Discuss Enterprise" },
];

export default function SubscriptionPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/workspaces", { cache: "no-store" })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not load your current plan."); return data; })
      .then(data => { if (active) setWorkspaces(data.workspaces ?? []); })
      .catch(e => { if (active) setNotice(e instanceof Error ? e.message : "Could not load your current plan."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const currentPlan = workspaces[0]?.plan || "Free";
  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>PLANS &amp; BILLING</small></span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link></header>
    <div className="tool-content">
      <div className="tool-eyebrow"><CreditCard size={15}/> CUSTOMER SUBSCRIPTIONS</div>
      <h1>Plans that grow with your business</h1>
      <p className="tool-intro">Review your BusinessIQ plan and explore the available subscription levels.</p>
      <section className="tool-warning monetization-warning"><ShieldCheck size={19}/><div><strong>Secure subscription checkout is being connected.</strong><p>You can review the plans here, but online payments and plan upgrades are not active yet. No payment will be taken from this page. We will enable subscription checkout only after Paystack verification and subscription access controls have been tested.</p></div></section>
      <section className="tool-stat-grid"><article><span>Your current plan</span><strong>{loading ? "Loading…" : currentPlan}</strong><small>{workspaces.length ? workspaces.length + " workspace(s) linked to your account" : "No workspace found yet"}</small></article><article><span>Billing status</span><strong>Not activated</strong><small>Checkout integration in progress</small></article><article><span>Payment security</span><strong>Verification first</strong><small>Server-verified Paystack payments</small></article></section>
      {notice && <p className="tool-footer-note">{notice}</p>}
      <h2 className="tool-section-title">Choose your plan</h2>
      <div className="subscription-plan-grid">{plans.map(plan => <article className={"subscription-plan-card" + (plan.featured ? " subscription-plan-featured" : "")} key={plan.name}>
        {plan.featured && <span className="subscription-popular"><Sparkles size={12}/> GROWING BUSINESSES</span>}
        <h3>{plan.name}</h3><p>{plan.description}</p>
        <ul>{plan.features.map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul>
        <button type="button" className={plan.featured ? "primary-btn subscription-action" : "subtle-btn subscription-action"} onClick={() => setNotice("The " + plan.name + " plan is listed for review. Secure subscription checkout is not active yet, so no payment has been initiated.")}>{currentPlan.toLowerCase() === plan.name.toLowerCase() ? "Your current plan" : plan.action}</button>
      </article>)}</div>
      <p className="tool-footer-note"><strong>Important:</strong> Plan prices, billing intervals, taxes and final feature limits will be displayed clearly before checkout is enabled. Subscription status will be activated only after payment is verified by BusinessIQ's server.</p>
    </div>
  </main>;
}
