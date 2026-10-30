import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";

type Props = { searchParams: Promise<{ status?: string; message?: string; plan?: string }> };

export default async function BillingResultPage({ searchParams }: Props) {
  const params = await searchParams;
  const success = params.status === "success";
  const message = params.message || (success ? "Your payment has been confirmed." : "Your payment could not be confirmed.");
  const plan = params.plan;
  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>SECURE BILLING</small></span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Dashboard</Link></header>
    <section className="tool-content" style={{maxWidth:640, paddingTop:64}}>
      <div className="tool-card" style={{padding:32}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18,color:success?"#168263":"#b45345"}}>
          {success ? <CheckCircle2 size={30}/> : <CircleAlert size={30}/>}
          <span className="tool-eyebrow">{success ? "PAYMENT CONFIRMED" : "PAYMENT NOT CONFIRMED"}</span>
        </div>
        <h1>{success ? "Your plan is active." : "We couldn't confirm your payment."}</h1>
        <p className="tool-intro">{message}</p>
        {success && plan && <p><strong>Active plan:</strong> {plan}</p>}
        <p style={{display:"flex",alignItems:"center",gap:8,color:"#668071",fontSize:13}}><ShieldCheck size={16}/> Payment confirmation is checked directly with Paystack.</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:24}}>
          <Link className="primary-btn" href="/">Open dashboard</Link>
          <Link className="subtle-btn" href="/pricing">View plans</Link>
        </div>
      </div>
    </section>
  </main>;
}
