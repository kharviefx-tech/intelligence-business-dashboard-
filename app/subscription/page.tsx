"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles, Building2, Crown, LoaderCircle, ArrowUpRight, RefreshCw } from "lucide-react";

type Workspace = { id: string; name: string; plan?: string };
type BillingCycle = "monthly" | "yearly";

const plans = [
  {
    name: "Free", code: "free", description: "A simple starting point for individuals getting their business records in order.",
    monthly: 0, yearly: 0, audience: "For getting started",
    features: ["Business workspace", "Transaction ledger", "Core business overview", "Explore the BusinessIQ experience"],
    action: "Included at no cost", tone: "standard",
  },
  {
    name: "Professional", code: "professional", description: "More visibility and room to grow for owners who want a clearer picture of business performance.",
    monthly: 23000, yearly: 230000, audience: "For growing businesses",
    features: ["Everything in Free", "Expanded business reporting", "More room for day-to-day operations", "A stronger view of business performance"],
    action: "Continue to secure payment", tone: "featured",
  },
  {
    name: "Business", code: "business", description: "A stronger operating plan for established businesses coordinating more activity and people.",
    monthly: 45000, yearly: 450000, audience: "For active teams",
    features: ["Everything in Professional", "Team-oriented operating workflows", "Higher operating capacity", "More support for day-to-day business oversight"],
    action: "Continue to secure payment", tone: "standard",
  },
  {
    name: "Enterprise", code: "enterprise", description: "A tailored BusinessIQ engagement for organisations with complex structures and specific operational needs.",
    monthly: null, yearly: null, audience: "For larger organisations",
    features: ["Everything in Business, scoped to your organisation", "Tailored rollout and implementation planning", "Requirements-led workflow configuration", "Organisation-wide onboarding discussion", "Priority implementation coordination", "Custom commercial terms"],
    action: "Request an Enterprise discussion", tone: "enterprise",
  },
];

const formatNaira = (amount: number) => "₦" + amount.toLocaleString("en-NG");

export default function SubscriptionPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error" | "info">("info");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState("");
  const [pendingReference, setPendingReference] = useState("");
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/workspaces", { cache: "no-store" })
      .then(async r => {
        if (r.status === 401) {
          window.location.assign("/login?next=%2Fsubscription");
          throw new Error("Please sign in to manage your subscription.");
        }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load your current plan.");
        return data;
      })
      .then(data => {
        if (active) {
          const rows = data.workspaces ?? [];
          setWorkspaces(rows);
          setSelectedWorkspaceId(rows[0]?.id ?? "");
        }
      })
      .catch(e => {
        if (active) {
          setNotice(e instanceof Error ? e.message : "Could not load your current plan.");
          setNoticeType("error");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const plan = params.get("plan");
    const reference = params.get("reference") || "";
    if (payment === "success") {
      setNotice("Payment verified successfully. Your " + (plan || "selected") + " plan is now active.");
      setNoticeType("success");
    } else if (payment === "pending") {
      setNotice("Paystack has not confirmed the payment yet. If you paid by bank transfer, complete the transfer and check the status below.");
      setNoticeType("info");
      setPendingReference(reference);
    } else if (payment === "review") {
      setNotice("The payment details did not match the expected amount or currency. Your plan has not been changed. Please contact support with your payment receipt.");
      setNoticeType("error");
    } else if (payment === "invalid") {
      setNotice("The payment return link is invalid. No plan changes were made.");
      setNoticeType("error");
    }
  }, []);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId) || workspaces[0];
  const currentPlan = selectedWorkspace?.plan || "Free";

  async function startCheckout(planCode: string) {
    if (planCode === "enterprise") {
      setNotice("Enterprise is arranged through a requirements discussion and custom quotation. No payment is requested until the scope and price are agreed.");
      setNoticeType("info");
      return;
    }
    if (planCode === "free") return;
    if (!selectedWorkspaceId) {
      setNotice("Create a BusinessIQ workspace before choosing a paid plan.");
      setNoticeType("error");
      return;
    }
    setCheckoutPlan(planCode);
    setNotice("");
    try {
      const response = await fetch("/api/billing/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedWorkspaceId, planCode, billingInterval: billingCycle }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.assign("/login?next=%2Fsubscription");
        return;
      }
      if (!response.ok || !data.authorizationUrl) throw new Error(data.error || "Could not start secure checkout.");
      window.location.assign(data.authorizationUrl);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not connect to Paystack. Please try again.");
      setNoticeType("error");
      setCheckoutPlan("");
    }
  }

  async function checkPaymentStatus() {
    if (!pendingReference) return;
    setCheckingPayment(true);
    try {
      const response = await fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: pendingReference }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to check payment status.");
      if (data.activated) {
        setNotice("Payment confirmed. Your " + (data.plan || "selected") + " plan is now active.");
        setNoticeType("success");
        setPendingReference("");
        const refreshed = await fetch("/api/workspaces", { cache: "no-store" });
        if (refreshed.ok) {
          const workspaceData = await refreshed.json();
          setWorkspaces(workspaceData.workspaces ?? []);
        }
      } else {
        setNotice("Payment is still pending with Paystack. If you chose bank transfer, make sure the transfer is complete, then check again.");
        setNoticeType("info");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to check payment status.");
      setNoticeType("error");
    } finally {
      setCheckingPayment(false);
    }
  }

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
        <div><strong>Secure Paystack checkout</strong><p>When you continue, you’ll be redirected to Paystack to choose from the payment methods enabled for this account, including card and supported bank payment options. BusinessIQ activates the plan only after the payment is verified.</p></div>
      </section>

      <section className="tool-stat-grid">
        <article><span>Your current plan</span><strong>{loading ? "Loading…" : currentPlan}</strong><small>{workspaces.length ? workspaces.length + " workspace(s) linked to your account" : "Create a workspace to subscribe"}</small></article>
        <article><span>Billing status</span><strong>{selectedWorkspace ? "Ready to upgrade" : "Workspace required"}</strong><small>{selectedWorkspace ? "Choose a plan and billing period" : "Your paid plan will be linked to a workspace"}</small></article>
        <article><span>Payment protection</span><strong>Server verified</strong><small>Plan access follows confirmed payment</small></article>
      </section>
      {notice && <div className={"subscription-notice subscription-notice-" + noticeType} role={noticeType === "error" ? "alert" : "status"}>
        <span>{notice}</span>
        {pendingReference && <button type="button" className="subtle-btn" onClick={checkPaymentStatus} disabled={checkingPayment}>{checkingPayment ? <LoaderCircle className="spin" size={14}/> : <RefreshCw size={14}/>} Check payment status</button>}
      </div>}

      {!loading && !workspaces.length && <section className="subscription-workspace-required"><strong>A workspace is required before checkout.</strong><p>Your subscription is attached to a BusinessIQ workspace so the correct organisation receives the plan upgrade.</p><Link className="primary-btn" href="/onboarding">Create a workspace <ArrowUpRight size={15}/></Link></section>}

      {workspaces.length > 1 && <label className="subscription-workspace-select">Workspace to upgrade
        <select value={selectedWorkspaceId} onChange={e => setSelectedWorkspaceId(e.target.value)}>
          {workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.plan || "Free"}</option>)}
        </select>
      </label>}

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
          const busy = checkoutPlan === plan.code;
          return <article className={"subscription-plan-card subscription-plan-" + plan.tone} key={plan.name}>
            {plan.tone === "featured" && <span className="subscription-popular"><Sparkles size={12}/> MOST POPULAR</span>}
            {plan.tone === "enterprise" && <span className="subscription-enterprise-label"><Crown size={13}/> PREMIUM ORGANISATION PLAN</span>}
            <div className="subscription-plan-audience">{plan.audience}</div>
            <h3>{plan.name}</h3>
            <p>{plan.description}</p>
            <div className="subscription-price">
              {amount === null ? <><strong>Custom</strong><span>Pricing based on your requirements</span></> :
                amount === 0 ? <><strong>₦0</strong><span>Free forever</span></> :
                <><strong>{formatNaira(amount)}</strong><span>{billingCycle === "monthly" ? "per month · paid upfront" : "per year · paid upfront"}</span>{billingCycle === "yearly" && <small>Equivalent to {formatNaira(Math.round(amount / 12))} per month</small>}</>}
            </div>
            <ul>{plan.features.map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul>
            <button type="button" className={(plan.tone === "featured" || plan.tone === "enterprise" ? "primary-btn" : "subtle-btn") + " subscription-action"} onClick={() => void startCheckout(plan.code)} disabled={loading || !!checkoutPlan || (plan.code === "free") || (plan.code !== "enterprise" && isCurrent) || (!selectedWorkspace && plan.code !== "enterprise")}>
              {busy ? <><LoaderCircle className="spin" size={15}/> Connecting to Paystack…</> : isCurrent && plan.code !== "enterprise" ? "Your current plan" : plan.action}
            </button>
            {plan.name === "Enterprise" && <small className="subscription-enterprise-foot">A fit for multi-team operations, tailored requirements and guided rollout.</small>}
          </article>;
        })}
      </div>

      <section className="subscription-enterprise-note">
        <div className="subscription-enterprise-icon"><Building2 size={19}/></div>
        <div><strong>Why choose Enterprise?</strong><p>Enterprise is for organisations that need a considered rollout rather than a one-size-fits-all subscription. We’ll scope the organisation’s teams, operating requirements, configuration and onboarding needs before preparing a tailored proposal. The scope and delivery commitments will be agreed before purchase.</p></div>
      </section>

      <p className="tool-footer-note"><strong>Billing transparency:</strong> Monthly and yearly options are paid upfront for the selected period. Yearly subscriptions are charged once per year at the displayed amount. BusinessIQ does not automatically renew these payments; you can renew manually before the period ends. Applicable taxes and final payment details are shown by Paystack before you confirm payment.</p>
    </div>
  </main>;
}
