"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createBrowserClient(supabaseUrl, supabaseAnonKey) : null;

function getPostAuthDestination() {
  const requested = new URLSearchParams(window.location.search).get("next");
  return requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCanResend(false);
    if (!supabase) {
      setError("Authentication is not configured yet. Please contact the platform administrator.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (authError) throw authError;
        if (data.session) {
          setMessage("Account created. Opening your workspace…");
          router.replace(getPostAuthDestination());
        } else {
          setMessage("Your account request was received. Check your inbox and spam folder for a confirmation email. If it does not arrive, use the resend option below.");
          setCanResend(true);
          setMode("signin");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) {
          const authCode = "code" in authError ? String(authError.code) : "";
          if (authCode === "email_not_confirmed" || /email not confirmed/i.test(authError.message)) {
            setCanResend(true);
            throw new Error("Your email address has not been confirmed yet. Check your inbox and spam folder, or resend the confirmation email below.");
          }
          throw authError;
        }
        setMessage("Signed in. Opening your workspace…");
        router.replace(getPostAuthDestination());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete authentication. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResendConfirmation() {
    setError("");
    setMessage("");
    if (!supabase) {
      setError("Authentication is not configured yet. Please contact the platform administrator.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (resendError) throw resendError;
      setMessage("If this address has a pending confirmation, Supabase will send a new email. Check your inbox and spam folder.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not request a new confirmation email. Please try again later.");
    } finally {
      setResending(false);
    }
  }

  return <main className="auth-page pbi-auth-page">
    <header className="auth-commandbar">
      <Link href="/" className="auth-brand"><span className="auth-brand-mark">B</span><span><strong>BusinessIQ</strong><small>BUSINESS INTELLIGENCE</small></span></Link>
      <div className="auth-command-tabs"><span className="selected">Workspace</span><span>Analytics</span><span>Security</span></div>
      <span className="auth-secure"><LockKeyhole size={14}/> Secure account access</span>
    </header>
    <div className="auth-workspace">
      <aside className="auth-sidepanel">
        <div className="auth-side-kicker"><i/> BUSINESSIQ WORKSPACE</div>
        <h1>Make every business decision count.</h1>
        <p>One clear workspace for financial performance, business intelligence and confident decisions.</p>
        <div className="auth-preview-card">
          <div className="auth-preview-head"><span>EXECUTIVE OVERVIEW</span><span className="auth-preview-live"><i/> LIVE</span></div>
          <div className="auth-preview-kpis"><div><small>NET RESULT</small><b>₦12.8m</b><i>+12.4%</i></div><div><small>REVENUE</small><b>₦24.6m</b><i>+8.2%</i></div></div>
          <div className="auth-preview-chart"><div className="auth-chart-labels"><span>PERFORMANCE TREND</span><span>LAST 6 MONTHS</span></div><div className="auth-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
          <div className="auth-preview-foot"><span><i/> Income</span><span><i/> Expenses</span><span>Workspace analytics</span></div>
        </div>
        <div className="auth-side-foot"><ShieldCheck size={15}/> Your workspace. Your records. Your decisions.</div>
      </aside>
      <section className="auth-form-stage">
        <div className="auth-form-wrap">
          <div className="auth-form-heading"><span className="tool-eyebrow">{mode === "signin" ? "ACCOUNT ACCESS" : "GET STARTED"}</span><h2>{mode === "signin" ? "Welcome back" : "Create your account"}</h2><p>{mode === "signin" ? "Sign in to open your BusinessIQ workspace." : "Create your account and set up your business workspace."}</p></div>
          {!supabase && <div className="auth-info"><strong>Setup required</strong><p>This sign-in screen is not connected. Please contact the platform administrator.</p></div>}
          <form onSubmit={handleSubmit}>
            {mode === "signup" && <label className="auth-field">Full name<input required minLength={2} maxLength={80} autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name"/></label>}
            <label className="auth-field">Email address<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com"/></label>
            <label className="auth-field">Password<span className="password-control"><input required type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
            {error && <div className="auth-error" role="alert">{error}</div>}
            {message && <div className="auth-success" role="status">{message}</div>}
            <button className="auth-submit" disabled={busy || resending} type="submit">{busy ? "Please wait…" : mode === "signin" ? "Sign in to BusinessIQ" : "Create BusinessIQ account"}</button>
          </form>
          {canResend && <button className="auth-resend" type="button" onClick={handleResendConfirmation} disabled={resending || busy}><Mail size={16}/>{resending ? "Requesting email…" : "Resend confirmation email"}</button>}
          <div className="auth-switch">{mode === "signin" ? "New to BusinessIQ?" : "Already have an account?"} <button onClick={() => {setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); setCanResend(false);}}>{mode === "signin" ? "Create an account" : "Sign in"}</button></div>
          <div className="auth-trust-row"><span><ShieldCheck size={14}/> Protected workspace access</span><span>8+ character password</span></div>
          <p className="auth-legal">By continuing, you agree to use BusinessIQ responsibly. Workspace information is available only to authorised account members.</p>
        </div>
      </section>
    </div>
  </main>;
}
