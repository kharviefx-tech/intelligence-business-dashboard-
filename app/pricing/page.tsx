import Link from "next/link";
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";

const plans = [
  { name: "Free", price: "₦0", period: "forever", description: "Explore BusinessIQ with the essentials.", features: ["One business workspace", "Core transaction tracking", "Essential performance overview", "CSV export"], featured: false },
  { name: "Starter", price: "₦23,000", period: "per month", description: "For individuals and small businesses getting organised.", features: ["Everything in Free", "Expanded transaction history", "Sales category insights", "Business performance trends", "Priority email support"], featured: false },
  { name: "Professional", price: "₦30,000", period: "per month", description: "For growing teams that need deeper visibility.", features: ["Everything in Starter", "Advanced sales analytics", "Customer segment reporting", "Geographic analytics", "More workspace capacity"], featured: true },
  { name: "Business", price: "₦45,000", period: "per month", description: "For established teams managing more complex operations.", features: ["Everything in Professional", "Multi-workspace workflows", "Advanced reporting tools", "Team collaboration controls", "Priority support"], featured: false },
];

export default function PricingPage() {
  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>PLANS &amp; BILLING</small></span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link></header>
    <div className="tool-content">
      <div className="tool-eyebrow"><CreditCard size={15}/> BUSINESSIQ PLANS</div>
      <h1>Choose the right plan for your business.</h1>
      <p className="tool-intro">Start with the essentials and move up as your reporting needs grow. Prices below are the proposed Nigerian launch rates.</p>
      <div className="tool-warning monetization-warning"><ShieldCheck size={19}/><div><strong>Subscriptions are not yet open for payment.</strong><p>These are draft launch prices. Checkout, recurring billing and automatic feature access will only be enabled after the payment provider, verified webhooks and subscription entitlements are configured and tested. You will not be charged from this page.</p></div></div>
      <div className="customer-pricing-grid">{plans.map((plan)=><article key={plan.name} className={plan.featured ? "customer-plan featured" : "customer-plan"}>{plan.featured && <span className="customer-plan-badge"><Sparkles size={13}/> MOST POPULAR</span>}<h2>{plan.name}</h2><p>{plan.description}</p><div className="customer-plan-price">{plan.price}<small> / {plan.period}</small></div><ul>{plan.features.map(feature=><li key={feature}><Check size={15}/>{feature}</li>)}</ul><Link className={plan.name==="Free" ? "subtle-btn customer-plan-cta" : "primary-btn customer-plan-cta"} href={plan.name==="Free" ? "/login?next=/" : "/login?next=/pricing"}>{plan.name==="Free" ? "Get started free" : "Sign in to continue"}</Link><small className="customer-plan-note">{plan.name==="Free" ? "No payment details required" : "Checkout opening soon"}</small></article>)}</div>
      <section className="pricing-faq"><h2>How subscriptions will work</h2><p>When billing opens, customers will be able to choose a plan, pay securely through a supported provider, manage invoices and cancellations, and receive plan access only after BusinessIQ verifies the payment server-side.</p><p>Need an enterprise arrangement? <a href="mailto:hello@businessiq.app">Contact the BusinessIQ team</a>.</p></section>
    </div>
  </main>;
}
