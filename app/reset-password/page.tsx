"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    let active = true;
    async function prepareRecoverySession() {
      try {
        const supabase = createClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (active && !session && (code || window.location.hash.includes("type=recovery"))) {
          setError("This password-reset link may have expired. Request a new one and open the newest email.");
        }
      } catch {
        if (active) setError("We could not verify this reset link. Request a new password-reset email and open the newest link.");
      } finally {
        if (active) setCheckingLink(false);
      }
    }
    void prepareRecoverySession();
    return () => { active = false; };
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setRequesting(true);
    try {
      const supabase = createClient();
      const redirectTo = new URL("/reset-password", window.location.origin).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) throw resetError;
      setResetSent(true);
      setMessage("If an account exists for that address, a password-reset email will be sent. Check your inbox and spam folder.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not request a reset email. Please try again.");
    } finally {
      setRequesting(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Open the password-reset link from your email again; it may have expired.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Your password has been updated. You can now sign in with your new password.");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => router.replace("/login"), 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not update your password. Request a new reset link.");
    } finally {
      setSaving(false);
    }
  }

  const hasRecoverySession = typeof window !== "undefined" && window.location.hash.includes("type=recovery");

  return <main className="auth-page">
    <div className="auth-top"><Link href="/login" className="back-link"><ArrowLeft size={16}/> Back to sign in</Link><span className="auth-secure"><LockKeyhole size={14}/> Account recovery</span></div>
    <section className="auth-card">
      <div className="auth-logo"><LockKeyhole size={23}/></div>
      <span className="tool-eyebrow">SECURE ACCOUNT ACCESS</span>
      <h1>Reset your password</h1>
      <p className="auth-intro">Request a secure reset link, then choose a new password from the email link.</p>
      {!resetSent && <form onSubmit={requestReset}>
        <label className="auth-field">Email address<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
        <button className="auth-submit" disabled={requesting} type="submit">{requesting ? "Sending request…" : "Send reset link"}</button>
      </form>}
      <form onSubmit={savePassword} style={{ marginTop: 20 }}>
        {checkingLink && <p className="settings-help">Verifying your reset link…</p>}
        <p className="settings-help">Already opened the reset link from your email? Enter your new password below.</p>
        <label className="auth-field">New password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/></label>
        <label className="auth-field">Confirm new password<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your new password"/></label>
        <button className="auth-submit" disabled={saving || checkingLink} type="submit">{saving ? "Updating password…" : "Update password"}</button>
      </form>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {message && <div className="auth-success" role="status">{message}</div>}
      <p className="auth-legal"><Mail size={14}/> Reset emails require the correct redirect URL to be allowed in Supabase Authentication settings.</p>
    </section>
  </main>;
}
