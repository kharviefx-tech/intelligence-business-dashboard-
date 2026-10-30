import Link from "next/link";
import MicrosoftConnect from "./MicrosoftConnect";
import { Activity, ArrowUpRight, BarChart3, CheckCircle2, Cloud, FileSpreadsheet, FolderKanban, Mail, MessageSquare, ShieldCheck, Share2, Settings2 } from "lucide-react";

const integrations = [
  { name: "Excel", category: "DATA & WORKBOOKS", icon: FileSpreadsheet, description: "Use BusinessIQ CSV imports today, then open Excel to prepare or review spreadsheet files. Native .xlsx ingestion is not yet enabled.", features: ["Import validated CSV files in BusinessIQ", "Analyse imported transaction records", "Export available reports as CSV"], href: "https://www.microsoft365.com/launch/excel" },
  { name: "Power BI", category: "BUSINESS ANALYTICS", icon: BarChart3, description: "Open Power BI separately. A secure in-app Power BI connection and report embedding are not yet available.", features: ["Use Power BI in its own service", "No account connection is currently stored", "Native report embedding is planned"], href: "https://app.powerbi.com/" },
  { name: "OneDrive", category: "CLOUD FILES", icon: Cloud, description: "OneDrive is listed as a future file-source connector. BusinessIQ does not yet browse or sync OneDrive files.", features: ["Open OneDrive separately", "No file sync is currently active", "Permission-scoped file access is planned"], href: "https://onedrive.live.com/" },
  { name: "SharePoint", category: "TEAM CONTENT", icon: FolderKanban, description: "SharePoint can be opened independently. BusinessIQ has not yet enabled SharePoint site or document-library sync.", features: ["Open SharePoint separately", "No site access is currently granted", "Governed document sync is planned"], href: "https://www.microsoft365.com/launch/sharepoint" },
  { name: "Outlook", category: "BUSINESS COMMUNICATION", icon: Mail, description: "Outlook is not yet connected to BusinessIQ. Email delivery and mailbox-based workflows require a separately configured, permission-scoped integration.", features: ["Open Outlook separately", "No mailbox access is currently active", "Approved report delivery is planned"], href: "https://outlook.office.com/mail/" },
  { name: "Microsoft Teams", category: "COLLABORATION", icon: MessageSquare, description: "Teams is not yet connected to BusinessIQ. Sharing and alerts will require an authorised Teams integration.", features: ["Open Teams separately", "No messages are sent by this card", "Workspace-controlled sharing is planned"], href: "https://teams.microsoft.com/" },
];

export default function IntegrationsPage() {
  return <main className="integrations-shell">
    <header className="integrations-topbar"><Link href="/" className="integrations-brand"><span className="integrations-mark">B</span><span><strong>BusinessIQ</strong><small>INDEPENDENT BUSINESS INTELLIGENCE</small></span></Link><Link href="/" className="integrations-back">← Back to dashboard</Link></header>
    <section className="integrations-content">
      <div className="integrations-eyebrow"><span/> BUSINESSIQ CONNECT</div>
      <div className="integrations-hero"><div><h1>Your business intelligence. One independent platform.</h1><p>BusinessIQ is designed to stand on its own as your organisation’s intelligence, reporting and decision-support platform. Connect Microsoft tools when they add value — they are optional integrations, not a requirement to use or grow BusinessIQ.</p></div><div className="integrations-hero-mark"><Share2 size={34}/><span>OPTIONAL CONNECTORS</span></div></div>
      <MicrosoftConnect />
      <div className="integration-notice"><ShieldCheck size={19}/><div><strong>BusinessIQ works independently</strong><p>Your core workspace, dashboards and business workflows remain BusinessIQ-led. Microsoft account linking and live data access will activate after the Entra application credentials are securely configured on the server.</p></div><span>OPTIONAL SETUP</span></div>
      <div className="integration-section-heading"><div><h2>Optional Microsoft integrations</h2><p>Connect only the services your organisation chooses to use.</p></div><span>6 CONNECTORS</span></div>
      <div className="integration-grid">{integrations.map(item => { const Icon=item.icon; return <article className="integration-card" key={item.name}>
        <div className="integration-card-top"><div className="integration-icon"><Icon size={21}/></div><span className="integration-status"><i/> Optional connector</span></div>
        <div className="integration-category">{item.category}</div><h3>{item.name}</h3><p className="integration-description">{item.description}</p>
        <ul>{item.features.map(feature=><li key={feature}><CheckCircle2 size={14}/>{feature}</li>)}</ul>
        <a className="integration-open" href={item.href} target="_blank" rel="noreferrer">Open {item.name}<ArrowUpRight size={15}/></a>
      </article>})}</div>
      <section className="integration-identity"><div className="integration-identity-icon"><Settings2 size={22}/></div><div><span>OPTIONAL IDENTITY & ACCESS</span><h2>Microsoft Entra ID + Microsoft Graph</h2><p>Use Microsoft sign-in and permission-based Graph access only where needed. BusinessIQ retains its own product identity, workspace experience and roadmap; each connector can be enabled independently with appropriate permissions.</p></div><span className="integration-status setup"><i/> Credentials pending</span></section>
      <footer className="integrations-footer">BusinessIQ Connect <span>•</span> Independent platform. Optional integrations. Organisation-controlled access.</footer>
    </section>
  </main>;
}
