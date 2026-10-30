"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, Bell, Building2, CheckCircle2, ChevronRight,
  CircleHelp, Code2, CreditCard, Globe2, KeyRound, Languages, LockKeyhole,
  Plug, Settings as SettingsIcon, ShieldCheck, SlidersHorizontal, Users, UserRound
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { LANGUAGES, useI18n, type LanguageCode } from "../components/i18n-provider";

const groups = [
  { title: "Workspace & people", description: "Manage the business workspace and the people who can access it.", items: [
    { href: "/profile", title: "Personal profile", description: "Name, photo, contact details, job title and timezone.", icon: UserRound },
    { href: "/team", title: "Team & permissions", description: "Invite colleagues, review workspace roles and revoke invitations.", icon: Users },
    { href: "/onboarding", title: "Workspace setup", description: "Create or configure the business workspace you work in.", icon: Building2 },
  ]},
  { title: "Connections & developer tools", description: "Control how BusinessIQ works with approved external systems.", items: [
    { href: "/integrations", title: "Integrations", description: "Review connected services and available data connectors.", icon: Plug },
    { href: "/marketplace", title: "App marketplace", description: "Explore workspace extensions and application modules.", icon: SlidersHorizontal },
    { href: "/developers", title: "Developer API & keys", description: "Create, review and revoke workspace API credentials.", icon: Code2 },
  ]},
  { title: "Plans & assistance", description: "Manage your subscription and get help using BusinessIQ.", items: [
    { href: "/subscription", title: "Plans & billing", description: "Review available plans and subscription settings.", icon: CreditCard },
    { href: "/help", title: "Help centre", description: "Guides, support information and troubleshooting.", icon: CircleHelp },
    { href: "/security", title: "Security information", description: "Understand current safeguards and platform security practices.", icon: ShieldCheck },
  ]},
];

export default function SettingsPage() {
  const { language, setLanguage } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
      if (authError || !user) { router.replace("/login?next=/settings"); return; }
      setEmail(user.email ?? "");
      setNewEmail(user.email ?? "");
      setLoading(false);
    }).catch(() => { setError("Could not load account settings."); setLoading(false); });
  }, [router]);

  async function updateEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ email: newEmail.trim() });
      if (updateError) throw updateError;
      setMessage("Email change requested. Follow the confirmation message if confirmation is enabled.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update email."); }
    finally { setBusy(false); }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(""); setConfirmPassword(""); setMessage("Password updated successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update password."); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="min-h-screen bg-slate-50 p-8 text-slate-500">Loading your settings…</main>;

  return <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={17}/> Dashboard</Link>
        <div className="flex items-center gap-2 text-sm font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#183b63] text-white">B</span> BusinessIQ <span className="ml-1 text-xs font-medium text-slate-400">SETTINGS</span></div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:py-10">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#315b86]">Control centre</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">One place to manage your account, workspace, security, connected tools and BusinessIQ preferences.</p></div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><CheckCircle2 size={15}/> Account settings loaded</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#183b63]"><LockKeyhole size={21}/></div><div><h2 className="font-bold">Sign-in & account security</h2><p className="text-xs text-slate-500">Manage the credentials used to access BusinessIQ.</p></div></div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <form onSubmit={updateEmail} className="space-y-3"><label className="block text-xs font-semibold text-slate-600">Current sign-in email<input value={email} readOnly className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"/></label><label className="block text-xs font-semibold text-slate-600">New email address<input type="email" required value={newEmail} onChange={e=>setNewEmail(e.target.value)} autoComplete="email" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"/></label><button disabled={busy} className="rounded-lg bg-[#183b63] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy?"Updating…":"Update email"}</button></form>
            <form onSubmit={updatePassword} className="space-y-3"><label className="block text-xs font-semibold text-slate-600">New password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"/></label><label className="block text-xs font-semibold text-slate-600">Confirm new password<input type="password" required minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"/></label><button disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 disabled:opacity-50">{busy?"Updating…":"Change password"}</button></form>
          </div>
          {error&&<p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {message&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-700"><Languages size={21}/></div><div><h2 className="font-bold">Language & region</h2><p className="text-xs text-slate-500">Set your preferred interface language.</p></div></div>
          <label className="mt-5 block text-xs font-semibold text-slate-600">Interface language<select value={language} onChange={e=>setLanguage(e.target.value as LanguageCode)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">{LANGUAGES.map(item=><option key={item.code} value={item.code}>{item.native} — {item.label}</option>)}</select></label>
          <p className="mt-3 text-xs leading-5 text-slate-500">Your preference is saved on this device. Language coverage varies by interface area; Arabic enables right-to-left support on compatible screens.</p>
          <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><Globe2 size={15} className="mr-2 inline-block"/>Regional time zone and business details are managed from your personal profile.</div>
          <Link href="/profile" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#183b63]">Open profile settings <ArrowUpRight size={14}/></Link>
        </article>
      </section>

      {groups.map(group=><section key={group.title}><div className="mb-3"><h2 className="text-lg font-bold">{group.title}</h2><p className="mt-1 text-sm text-slate-500">{group.description}</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{group.items.map(item=><Link key={item.href} href={item.href} className="group flex min-h-[112px] items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-[#183b63]"><item.icon size={19}/></span><span className="min-w-0 flex-1"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span></span><ChevronRight size={16} className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#183b63]"/></Link>)}</div></section>)}

      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 text-amber-800"/><div><h2 className="text-sm font-bold text-amber-950">Administrator-managed controls</h2><p className="mt-1 text-xs leading-5 text-amber-900/80">Plan entitlements, usage limits, platform-wide security policies and administrative access are controlled by authorised administrators. They cannot be changed from a standard user account.</p></div></div></section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500"><span>BusinessIQ · Account and workspace control centre</span><Link href="/help" className="inline-flex items-center gap-1 font-semibold text-[#183b63]">Need help? <ArrowUpRight size={13}/></Link></footer>
    </div>
  </main>;
}
