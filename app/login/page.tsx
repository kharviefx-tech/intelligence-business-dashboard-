"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createBrowserClient(supabaseUrl, supabaseAnonKey) : null;

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
          router.push("/onboarding");
          router.refresh();
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
        router.push("/onboarding");
        router.refresh();
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

  return <main className="auth-page">
    <div className="auth-top"><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to preview</Link><span className="auth-secure"><LockKeyhole size={14}/> Secure account access</span></div>
    <section className="auth-card">
      <div className="auth-logo">B</div>
      <span className="tool-eyebrow">BUSINESS INTELLIGENCE WORKSPACE</span>
      <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p className="auth-intro">{mode === "signin" ? "Sign in to continue to your business workspace." : "Set up your account to begin your workspace journey."}</p>
      {!supabase && <div className="auth-info"><strong>Setup required</strong><p>This sign-in screen is not connected. Please contact the platform administrator.</p></div>}
      <form onSubmit={handleSubmit}>
        {mode === "signup" && <label className="auth-field">Your name<input required minLength={2} maxLength={80} autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Alex Morgan"/></label>}
        <label className="auth-field">Email address<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
        <label className="auth-field">Password<span className="password-control"><input required type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {message && <div className="auth-success" role="status">{message}</div>}
        <button className="auth-submit" disabled={busy || resending} type="submit">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      {canResend && <button className="auth-resend" type="button" onClick={handleResendConfirmation} disabled={resending || busy}><Mail size={16}/>{resending ? "Requesting email…" : "Resend confirmation email"}</button>}
      <p className="auth-switch">{mode === "signin" ? "New to the platform?" : "Already have an account?"} <button onClick={() => {setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); setCanResend(false);}}>{mode === "signin" ? "Create an account" : "Sign in instead"}</button></p>
      <p className="auth-legal">Use a unique password. Never share your password or account recovery codes. Workspace data access is controlled by account permissions.</p>
    </section>
  </main>;
}
