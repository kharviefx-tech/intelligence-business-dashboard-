"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Profile = { id: string; full_name: string | null; platform_role: string; monthly_transaction_limit: number; created_at: string };
export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  async function load() {
    setLoading(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in to continue.");
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 403) { window.location.replace("/"); return; }
      if (!response.ok) throw new Error(result.error || "Could not load administrator records.");
      setIsAdmin(true);
      const rows = (result.profiles ?? []) as Profile[];
      setProfiles(rows);
      setDrafts(Object.fromEntries(rows.map(p => [p.id, String(p.monthly_transaction_limit ?? 0)])));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load account controls."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveLimit(profile: Profile) {
    setError(""); setNotice("");
    const raw = drafts[profile.id] ?? "0";
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 1000000) { setError("Limits must be a whole number from 0 to 1,000,000. Use 0 for unlimited."); return; }
    setSaving(profile.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile.id, monthly_transaction_limit: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update the limit.");
      setProfiles(current => current.map(p => p.id === profile.id ? { ...p, monthly_transaction_limit: value } : p));
      setNotice("Account limit saved. The database enforces this limit for new transactions.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update the limit."); }
    finally { setSaving(""); }
  }

  return <main className="tool-page">
    <header className="tool-topbar"><Link href="/" className="tool-brand"><span className="tool-brand-mark">B</span><span>BusinessIQ <small>PLATFORM CONTROL</small></span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link></header>
    <div className="tool-content">
      <div className="tool-eyebrow"><LockKeyhole size={15}/> ADMINISTRATION</div><h1>Admin control centre</h1>
      <p className="tool-intro">Manage account access limits. Users and staff can edit their own profiles and account security, but only administrators can change usage limits.</p>
      <div className="tool-warning"><ShieldCheck size={19}/><div><strong>Administrator-only controls</strong><p>Limit changes are checked by the BusinessIQ server against your administrator role before they reach Neon. A limit of 0 means unlimited.</p></div></div>
      {error && <div className="auth-error" role="alert">{error}</div>}{notice && <div className="auth-success" role="status">{notice}</div>}
      <div className="admin-toolbar"><div><h2 className="tool-section-title"><Users size={19}/> User &amp; staff limits</h2><p className="tool-intro">Monthly transaction allowance per account.</p></div><button className="subtle-btn" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
      {loading ? <div className="tool-card">Loading account records…</div> : isAdmin && <div className="admin-users-list">{profiles.map(p=><article className="admin-user-row" key={p.id}><div className="admin-user-ident"><span className="workspace-avatar">{(p.full_name || "U").slice(0,2).toUpperCase()}</span><div><strong>{p.full_name || "Unnamed account"}</strong><small>{p.platform_role.replaceAll("_"," ")} · {p.id.slice(0,8)}…</small></div></div><label className="admin-limit-field">Monthly transaction limit<input type="number" min="0" max="1000000" step="1" value={drafts[p.id] ?? "0"} onChange={e=>setDrafts(v=>({...v,[p.id]:e.target.value}))}/><small>0 = unlimited</small></label><button className="primary-btn" onClick={()=>void saveLimit(p)} disabled={saving===p.id}>{saving===p.id?"Saving…":"Save limit"}</button></article>)}</div>}
      <div className="tool-footer-note"><strong>Self-service:</strong> <Link href="/profile">Profile</Link> · <Link href="/settings">Account settings</Link>. Users can view their limit, but cannot change it themselves.</div>
    </div>
  </main>;
}
