import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, CreditCard, FileText, LockKeyhole, Settings, ShieldCheck, Users, Wallet } from "lucide-react";

const tools = [
  { title: "User & access management", detail: "Planned account roles, invitations, suspension and access review.", icon: Users, status: "Backend required" },
  { title: "Workspace oversight", detail: "Planned company workspace list, status and support context.", icon: Activity, status: "Backend required" },
  { title: "Security & audit trail", detail: "Planned sign-in events, privileged actions and audit history.", icon: ShieldCheck, status: "Backend required" },
  { title: "Platform analytics", detail: "Planned active users, retention and product usage reporting.", icon: BarChart3, status: "Backend required" },
  { title: "Content & resources", detail: "Planned management for learning materials and business templates.", icon: FileText, status: "Backend required" },
  { title: "Platform settings", detail: "Planned configuration, support controls and feature flags.", icon: Settings, status: "Backend required" },
];

export default function AdminPage() {
  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>PLATFORM CONTROL</small></span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link></header>
    <div className="tool-content">
      <div className="tool-eyebrow"><LockKeyhole size={15}/> ADMINISTRATION</div>
      <h1>Admin control centre</h1>
      <p className="tool-intro">A dedicated home for operating the platform responsibly as it grows.</p>
      <div className="tool-warning"><ShieldCheck size={19}/><div><strong>Administrator authentication is not connected yet.</strong><p>This page is a planning interface, not a protected admin console. Do not use it to manage real users or confidential company data. Before launch, enforce server-side role checks and database permissions; hiding a link is not security.</p></div></div>
      <div className="tool-stat-grid"><article><span>Admin access</span><strong>Not configured</strong><small>Identity provider required</small></article><article><span>Audit logging</span><strong>Not connected</strong><small>Database event records required</small></article><article><span>Live platform metrics</span><strong>Unavailable</strong><small>No production data connected</small></article></div>
      <h2 className="tool-section-title">Administration tools</h2>
      <div className="tool-card-grid">{tools.map(({title,detail,icon:Icon,status})=><article className="tool-card" key={title}><div className="tool-card-icon"><Icon size={19}/></div><h3>{title}</h3><p>{detail}</p><span className="tool-status">{status}</span></article>)}</div>
      <div className="tool-footer-note"><strong>Implementation order:</strong> secure sign-in → server-verified admin role → audit logs → least-privilege access → protected admin actions → monitoring and recovery tests.</div>
    </div>
  </main>;
}
