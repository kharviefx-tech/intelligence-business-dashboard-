"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function checkAccount() {
      const supabase = createClient();
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.replace("/login");
          return;
        }

        // Returning users should resume an existing workspace instead of creating another one.
        const response = await fetch("/api/workspaces", { cache: "no-store" });
        const workspaceData = await response.json();
        if (!response.ok) throw new Error(workspaceData.error || "Unable to check your workspace.");
        if ((workspaceData.workspaces ?? []).length > 0) {
          router.replace("/");
          router.refresh();
          return;
        }
        if (active) setChecking(false);
      } catch {
        if (active) {
          setError("We could not check your saved workspace. Please refresh or sign in again.");
          setChecking(false);
        }
      }
    }
    void checkAccount();
    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleaned = name.trim();
    if (cleaned.length < 2 || cleaned.length > 120) {
      setError("Workspace name must be between 2 and 120 characters.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleaned, currency }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create workspace.");
      router.replace("/");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to create workspace.";
      setError(message.toLowerCase().includes("duplicate key")
        ? "That workspace name is already in use. Add another word to make it unique."
        : message);
    } finally { setBusy(false); }
  }

  if (checking) return <main className="auth-page"><section className="auth-card"><p>Checking your saved workspace…</p></section></main>;

  return <main className="auth-page">
    <div className="auth-top"><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to dashboard</Link><span className="auth-secure"><Building2 size={14}/> Workspace setup</span></div>
    <section className="auth-card">
      <div className="auth-logo"><Building2 size={23}/></div>
      <span className="tool-eyebrow">YOUR BUSINESS WORKSPACE</span>
      <h1>Create your workspace</h1>
      <p className="auth-intro">No workspace is linked to this account yet. Create one only if you are setting up a new business; returning users are sent straight to their saved workspace.</p>
      <form onSubmit={submit}>
        <label className="auth-field">Business or workspace name<input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Commerce"/></label>
        <label className="auth-field">Base reporting currency<select value={currency} onChange={e => setCurrency(e.target.value)}>{[["NGN","Nigerian naira (NGN)"],["USD","US dollar (USD)"],["GBP","Pound sterling (GBP)"],["EUR","Euro (EUR)"],["GHS","Ghanaian cedi (GHS)"],["KES","Kenyan shilling (KES)"],["ZAR","South African rand (ZAR)"]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="auth-submit" disabled={busy} type="submit">{busy ? "Creating workspace…" : "Create workspace"}</button>
      </form>
      <p className="auth-legal">Workspace records are stored in isolated Business Intelligence tables. Currency conversion is not implemented yet.</p>
    </section>
  </main>;
}
