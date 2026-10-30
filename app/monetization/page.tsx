import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, BarChart3, CreditCard, FileText, Globe, Receipt, ShieldCheck, Wallet } from "lucide-react";

const items = [
  { title: "Customer plans", detail: "Public plan comparison is available. Paid checkout remains disabled until billing is securely connected.", icon: CreditCard },
  { title: "Billing & invoices", detail: "Customer invoices, receipts, payment status and billing history will be powered by verified provider events.", icon: Receipt },
  { title: "Revenue analytics", detail: "Track recurring revenue, churn, upgrades, refunds and failed payments after live billing is enabled.", icon: BarChart3 },
  { title: "Payment provider setup", detail: "Provider onboarding, test-mode validation and signed webhook verification are required before launch.", icon: Wallet },
  { title: "Offers & coupons", detail: "Trials, discount codes and campaign reporting are planned for a later release.", icon: BadgeDollarSign },
  { title: "International pricing", detail: "Local currency and country-aware provider routing will be enabled after regional payment accounts are verified.", icon: Globe },
];

export default function MonetizationPage() {
  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>REVENUE OPERATIONS</small></span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link></header>
    <div className="tool-content">
      <div className="tool-eyebrow"><BadgeDollarSign size={15}/> MONETIZATION</div>
      <h1>Monetization centre</h1>
      <p className="tool-intro">Manage the customer subscription experience and prepare BusinessIQ billing operations.</p>
      <div className="tool-warning monetization-warning"><ShieldCheck size={19}/><div><strong>Customer pricing is visible; payment collection is still disabled.</strong><p>The public plans page is ready for review. No customers are being charged and no paid entitlements are being granted. Before launch, connect and verify the payment providers, create server-side price mappings, implement signed webhooks, subscription records, cancellation/refund handling and access checks.</p></div></div>
      <div className="tool-stat-grid"><article><span>Public plans page</span><strong>Available</strong><small><Link href="/pricing">Open customer pricing →</Link></small></article><article><span>Paying customers</span><strong>0 connected</strong><small>Billing provider not active</small></article><article><span>Payment status</span><strong>Disabled</strong><small>Safe preview mode</small></article></div>
      <h2 className="tool-section-title">Revenue tools</h2>
      <div className="tool-card-grid">{items.map(({title,detail,icon:Icon})=><article className="tool-card" key={title}><div className="tool-card-icon"><Icon size={19}/></div><h3>{title}</h3><p>{detail}</p><span className="tool-status">In preparation</span></article>)}</div>
      <section className="pricing-preview"><div><span className="tool-eyebrow">PROPOSED NIGERIAN LAUNCH RATES</span><h2>Simple plans that scale with customers.</h2><p>Draft monthly rates shown on the customer pricing page. Confirm final prices before enabling checkout.</p><Link href="/pricing">View public plans →</Link></div><div className="pricing-pills"><span>Free</span><span>Starter · ₦23k</span><span>Professional · ₦30k</span><span>Business · ₦45k</span></div></section>
      <div className="tool-footer-note"><strong>Launch gate:</strong> do not enable charges or paid feature access until payment accounts are verified, checkout is tested, webhook signatures and idempotency are validated, and cancellation/refund flows work. Never store raw card details.</div>
      <div className="tool-secondary-link"><FileText size={16}/> Investment and share ownership are separate from product subscriptions and require appropriate legal and regulatory review.</div>
    </div>
  </main>;
}
