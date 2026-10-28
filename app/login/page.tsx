"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!supabase) {
      setError("Authentication is not configured yet. Add the Supabase URL and public anon key to your local environment, then restart the app.");
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
          setMessage("Account created. If email confirmation is enabled in Supabase, confirm your email before signing in.");
          setMode("signin");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        setMessage("Signed in. Opening the dashboard…");
        router.push("/onboarding");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete authentication. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <div className="auth-top"><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to preview</Link><span className="auth-secure"><LockKeyhole size={14}/> Secure account access</span></div>
    <section className="auth-card">
      <div className="auth-logo">B</div>
      <span className="tool-eyebrow">BUSINESS INTELLIGENCE WORKSPACE</span>
      <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p className="auth-intro">{mode === "signin" ? "Sign in to continue to your business workspace." : "Set up your account to begin your workspace journey."}</p>
      {!supabase && <div className="auth-info"><strong>Setup required</strong><p>This sign-in screen is ready, but it is not connected until Supabase environment variables are configured.</p></div>}
      <form onSubmit={handleSubmit}>
        {mode === "signup" && <label className="auth-field">Your name<input required minLength={2} maxLength={80} autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Alex Morgan"/></label>}
        <label className="auth-field">Email address<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"/></label>
        <label className="auth-field">Password<span className="password-control"><input required type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {message && <div className="auth-success" role="status">{message}</div>}
        <button className="auth-submit" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="auth-switch">{mode === "signin" ? "New to the platform?" : "Already have an account?"} <button onClick={() => {setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage("");}}>{mode === "signin" ? "Create an account" : "Sign in instead"}</button></p>
      <p className="auth-legal">Use a unique password. Never share your password or account recovery codes. Account access and company data permissions will be enforced in stages as the backend is completed.</p>
    </section>
  </main>;
}
