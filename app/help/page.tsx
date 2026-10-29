"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CircleHelp, ChevronDown, CircleUserRound, FileText, Mail, Search, Settings, ShieldCheck, Wallet, LifeBuoy, Copy, Check } from "lucide-react";

const topics = [
  { category: "Account & profile", icon: CircleUserRound, items: [
    { q: "How do I update my profile?", a: "Open My profile from the dashboard menu. You can update your name, profile photo, phone number, job title, short introduction, company details, preferred workspace and time zone. Select Save profile changes to store your updates." },
    { q: "How do I change my sign-in email or password?", a: "Open Account settings. You can request an email change or set a new password. Depending on the security configuration of your account, an email change may require confirmation before it takes effect." },
    { q: "Why is my platform access role shown as “user”?", a: "The platform access role controls access to BusinessIQ administration. “User” is the normal account role and is not the same as your role inside a company workspace. For example, you may be an owner in a workspace while still being a standard platform user. Only a platform administrator can assign administrative access." },
  ]},
  { category: "Workspace & transactions", icon: Wallet, items: [
    { q: "Why can’t I see a company workspace?", a: "Your profile can connect only to workspaces where your account already has membership. If the expected workspace is missing, ask its owner or an administrator to check your membership, then refresh BusinessIQ." },
    { q: "How do I record a transaction?", a: "From the dashboard, select Add transaction, enter the description, type, amount, date and category, then save. Transactions are saved to the selected workspace and the dashboard recalculates from records you are authorised to view." },
    { q: "Why do my figures show zero?", a: "Confirm that you have selected the correct workspace and reporting period, and that transactions are marked Recorded rather than Pending or Cancelled. The dashboard does not invent figures; totals come from your workspace records and selected currency." },
    { q: "How do I export my records?", a: "Use Export or Export CSV from the dashboard transaction ledger. The downloaded CSV contains the records currently available to your account and can be opened in a spreadsheet application." },
  ]},
  { category: "Security & permissions", icon: ShieldCheck, items: [
    { q: "Why can’t I change my monthly transaction allowance?", a: "Transaction allowances are administrator-managed. This protects account limits from being changed by the account holder and the database enforces the restriction. Contact your platform administrator if you believe the allowance is incorrect." },
    { q: "Why can’t I open Admin Centre or Monetization?", a: "These are private platform administration areas. They are available only to accounts assigned the admin or super_admin platform role. Hiding a link is not the only protection; access is also checked on the protected route." },
  ]},
];

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState("How do I update my profile?");
  const [copied, setCopied] = useState(false);
  const filtered = useMemo(() => topics.map(topic => ({ ...topic, items: topic.items.filter(item => (item.q + " " + item.a + " " + topic.category).toLowerCase().includes(query.toLowerCase())) })).filter(topic => topic.items.length), [query]);
  const supportText = "BusinessIQ support request\n\nPlease describe the issue:\n\nPage or feature:\n\nWhat I expected:\n\nWhat happened:\n\nBrowser/device (optional):";
  async function copySupportTemplate() {
    try { await navigator.clipboard.writeText(supportText); setCopied(true); window.setTimeout(() => setCopied(false), 2500); }
    catch { window.location.href = "mailto:?subject=BusinessIQ%20Support%20Request&body=" + encodeURIComponent(supportText); }
  }
  return <main className="help-page">
    <header className="help-topbar"><Link href="/" className="help-brand"><span className="help-brand-mark">B</span><span>BusinessIQ<small>HELP &amp; SUPPORT</small></span></Link><Link href="/" className="help-back"><ArrowLeft size={16}/> Back to dashboard</Link></header>
    <section className="help-hero"><div className="help-hero-icon"><LifeBuoy size={24}/></div><div className="help-kicker">BUSINESSIQ HELP CENTRE</div><h1>How can we help?</h1><p>Find practical answers about your account, workspace, transactions and access permissions.</p><label className="help-search"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search help articles…" aria-label="Search help articles"/>{query && <button type="button" onClick={() => setQuery("")}>Clear</button>}</label></section>
    <div className="help-layout"><section className="help-articles">{filtered.length ? filtered.map(topic => <div className="help-topic" key={topic.category}><div className="help-topic-title"><span><topic.icon size={17}/></span><h2>{topic.category}</h2></div><div className="help-faq-list">{topic.items.map(item => <article className="help-faq" key={item.q}><button type="button" className="help-question" aria-expanded={opened === item.q} onClick={() => setOpened(opened === item.q ? "" : item.q)}><span>{item.q}</span><ChevronDown size={17} className={opened === item.q ? "help-chevron is-open" : "help-chevron"}/></button>{opened === item.q && <div className="help-answer">{item.a}</div>}</article>)}</div></div>) : <div className="help-empty"><CircleHelp size={25}/><h2>No matching help articles</h2><p>Try a shorter search such as “profile”, “workspace” or “password”.</p><button onClick={() => setQuery("")}>Show all help articles</button></div>}</section>
      <aside className="help-sidebar"><section className="help-card"><span className="help-card-icon"><BookOpen size={19}/></span><h2>Quick links</h2><p>Go straight to the account tools you need.</p><Link href="/profile"><CircleUserRound size={16}/> My profile</Link><Link href="/settings"><Settings size={16}/> Account settings</Link><Link href="/#transactions"><Wallet size={16}/> Transactions</Link><Link href="/#reports"><FileText size={16}/> Reports &amp; exports</Link></section><section className="help-card help-contact-card"><span className="help-card-icon"><Mail size={19}/></span><h2>Still need help?</h2><p>Prepare a clear support request with the page, expected result and what went wrong. Do not include your password or security codes.</p><button type="button" onClick={() => void copySupportTemplate()}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "Support template copied" : "Copy support request template"}</button><a href={"mailto:?subject=BusinessIQ%20Support%20Request&body=" + encodeURIComponent(supportText)}><Mail size={16}/> Open email draft</a></section><div className="help-security-note"><ShieldCheck size={17}/><span>Your workspace data and administrator controls remain protected by your account permissions.</span></div></aside>
    </div><footer className="help-footer"><span>BusinessIQ Help Centre</span><span>Answers for account and workspace use</span><Link href="/">Return to dashboard</Link></footer>
  </main>;
}
