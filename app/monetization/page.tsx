import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, BarChart3, CreditCard, FileText, Globe, Receipt, ShieldCheck, Wallet } from "lucide-react";

const items = [
  { title: "Subscription plans", detail: "Configure Free, Professional, Business and Enterprise tiers after validating costs and customer demand.", icon: CreditCard },
  { title: "Billing & invoices", detail: "Planned subscription invoices, payment status, receipts and customer billing history.", icon: Receipt },
  { title: "Revenue analytics", detail: "Track recurring revenue, churn, upgrades, refunds and failed payments from verified billing events.", icon: BarChart3 },
  { title: "Payment provider setup", detail: "Add a supported payment provider after business verification, webhook validation and test-mode checks.", icon: Wallet },
  { title: "Offers & coupons", detail: "Planned trials, discount codes, eligibility rules and campaign reporting.", icon: BadgeDollarSign },
  { title: "International pricing", detail: "Prepare local currency display, tax handling and country-specific checkout requirements.", icon: Globe },
];

export default function MonetizationPage() {
  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>REVENUE OPERATIONS</small></span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link></header>
    <div className="tool-content">
      <div className="tool-eyebrow"><BadgeDollarSign size={15}/> MONETIZATION</div>
      <h1>Monetization centre</h1>
      <p className="tool-intro">A dedicated place to plan subscriptions, billing and sustainable product revenue.</p>
      <div className="tool-warning monetization-warning"><ShieldCheck size={19}/><div><strong>Payments and subscriptions are not active.</strong><p>No payment provider is connected, no customers are being charged, and the figures below are not live revenue. Payment collection should only be enabled after server-side billing, verified webhooks, refund handling, privacy terms and business verification are complete.</p></div></div>
      <div className="tool-stat-grid"><article><span>Live subscription revenue</span><strong>Not connected</strong><small>Billing provider required</small></article><article><span>Paying customers</span><strong>Not available</strong><small>No billing records connected</small></article><article><span>Payment status</span><strong>Disabled</strong><small>Safe preview mode</small></article></div>
      <h2 className="tool-section-title">Revenue tools</h2>
      <div className="tool-card-grid">{items.map(({title,detail,icon:Icon})=><article className="tool-card" key={title}><div className="tool-card-icon"><Icon size={19}/></div><h3>{title}</h3><p>{detail}</p><span className="tool-status">Planned · Not active</span></article>)}</div>
      <section className="pricing-preview"><div><span className="tool-eyebrow">PROPOSED MODEL</span><h2>Start accessible. Grow sustainably.</h2><p>Draft tiers for product planning only. Features and prices are not final.</p></div><div className="pricing-pills"><span>Free</span><span>Professional</span><span>Business</span><span>Enterprise</span></div></section>
      <div className="tool-footer-note"><strong>Before launch:</strong> choose a payment provider, define published prices and terms, implement server-side subscription checks, validate signed webhooks, test cancellations/refunds, and reconcile billing records. Never store raw card details yourself.</div>
      <div className="tool-secondary-link"><FileText size={16}/> Investment and share ownership are separate from product monetization and must not be offered without appropriate legal and regulatory review.</div>
    </div>
  </main>;
}
