import Link from "next/link";
import MicrosoftConnect from "./MicrosoftConnect";
import { Activity, ArrowUpRight, BarChart3, CheckCircle2, Cloud, FileSpreadsheet, FolderKanban, Mail, MessageSquare, ShieldCheck, Share2, Settings2 } from "lucide-react";

const integrations = [
  { name: "Excel", category: "DATA & WORKBOOKS", icon: FileSpreadsheet, description: "Bring workbook data into BusinessIQ, refresh analysis, and export clean reports back to Excel.", features: ["Import .xlsx workbooks", "Analyse tables and trends", "Export BusinessIQ reports"], href: "https://www.microsoft365.com/launch/excel" },
  { name: "Power BI", category: "BUSINESS ANALYTICS", icon: BarChart3, description: "Connect Power BI workspaces and reports for a unified analytics experience alongside BusinessIQ insights.", features: ["Discover reports and dashboards", "Embed authorised reports", "Share governed insights"], href: "https://app.powerbi.com/" },
  { name: "OneDrive", category: "CLOUD FILES", icon: Cloud, description: "Use business files stored in OneDrive as source material for your workspace and reporting workflows.", features: ["Browse authorised files", "Select source documents", "Export reports to folders"], href: "https://onedrive.live.com/" },
  { name: "SharePoint", category: "TEAM CONTENT", icon: FolderKanban, description: "Bring approved SharePoint documents and team libraries into your business reporting workflow.", features: ["Browse sites and libraries", "Use shared business documents", "Publish report files"], href: "https://www.microsoft365.com/launch/sharepoint" },
  { name: "Outlook", category: "BUSINESS COMMUNICATION", icon: Mail, description: "Prepare and deliver business summaries, scheduled reports and operational email updates.", features: ["Send report summaries", "Use mailbox-approved workflows", "Receive report notifications"], href: "https://outlook.office.com/mail/" },
  { name: "Microsoft Teams", category: "COLLABORATION", icon: MessageSquare, description: "Bring BusinessIQ alerts and performance summaries into the conversations where your team works.", features: ["Share report links", "Send team alerts", "Post approved summaries"], href: "https://teams.microsoft.com/" },
];

export default function IntegrationsPage() {
  return <main className="integrations-shell">
    <header className="integrations-topbar"><Link href="/" className="integrations-brand"><span className="integrations-mark">B</span><span><strong>BusinessIQ</strong><small>BUSINESS INTELLIGENCE</small></span></Link><Link href="/" className="integrations-back">← Back to dashboard</Link></header>
    <section className="integrations-content">
      <div className="integrations-eyebrow"><span/> BUSINESSIQ CONNECT</div>
      <div className="integrations-hero"><div><h1>Microsoft 365, connected to your business.</h1><p>Bring your Microsoft tools into one BusinessIQ workspace. Choose the services your organisation uses and build a connected reporting workflow without changing your BusinessIQ identity or branding.</p></div><div className="integrations-hero-mark"><Share2 size={34}/><span>MICROSOFT 365</span></div></div>
      <MicrosoftConnect />\n      <div className="integration-notice"><ShieldCheck size={19}/><div><strong>Secure connection setup required</strong><p>Microsoft services are listed and ready for configuration. Live account linking and data access will activate after the BusinessIQ Microsoft Entra app is registered and its credentials are securely added to the server.</p></div><span>SETUP REQUIRED</span></div>
      <div className="integration-section-heading"><div><h2>Microsoft services</h2><p>Choose the services you want to connect to BusinessIQ.</p></div><span>6 SERVICES</span></div>
      <div className="integration-grid">{integrations.map(item => { const Icon=item.icon; return <article className="integration-card" key={item.name}>
        <div className="integration-card-top"><div className="integration-icon"><Icon size={21}/></div><span className="integration-status"><i/> Not connected</span></div>
        <div className="integration-category">{item.category}</div><h3>{item.name}</h3><p className="integration-description">{item.description}</p>
        <ul>{item.features.map(feature=><li key={feature}><CheckCircle2 size={14}/>{feature}</li>)}</ul>
        <a className="integration-open" href={item.href} target="_blank" rel="noreferrer">Open {item.name}<ArrowUpRight size={15}/></a>
      </article>})}</div>
      <section className="integration-identity"><div className="integration-identity-icon"><Settings2 size={22}/></div><div><span>IDENTITY & ACCESS</span><h2>Microsoft Entra ID + Microsoft Graph</h2><p>One secure authorisation layer will power Microsoft sign-in and permission-based access to Excel, Power BI, OneDrive, SharePoint, Outlook and Teams. BusinessIQ will request only the permissions needed for each feature.</p></div><span className="integration-status setup"><i/> Awaiting app registration</span></section>
      <footer className="integrations-footer">BusinessIQ Connect <span>•</span> Your data stays under your organisation’s access permissions.</footer>
    </section>
  </main>;
}
