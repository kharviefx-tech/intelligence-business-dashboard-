"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Camera, CheckCircle2, Globe, LoaderCircle, MapPin, ShieldCheck, UserRound, BriefcaseBusiness, Settings2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  id: string; full_name: string | null; platform_role: string; monthly_transaction_limit: number;
  avatar_url: string | null; phone: string | null; job_title: string | null; bio: string | null;
  company_name: string | null; company_website: string | null; timezone: string | null;
};
type Membership = { role: string; organization_id: string; organization: { name: string } | null };

const timezones = ["Africa/Lagos","Africa/Accra","Africa/Nairobi","Africa/Johannesburg","Europe/London","Europe/Paris","America/New_York","America/Los_Angeles","Asia/Dubai","Asia/Kolkata","UTC"];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [workspace, setWorkspace] = useState("No workspace assigned");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.replace("/login"); return; }
      const [{ data: p, error: pError }, { data: membership }] = await Promise.all([
        supabase.from("bi_profiles").select("id,full_name,platform_role,monthly_transaction_limit,avatar_url,phone,job_title,bio,company_name,company_website,timezone").eq("id", user.id).maybeSingle(),
        supabase.from("bi_organization_members").select("role,organization_id,organization:bi_organizations(name)").eq("user_id", user.id).limit(1).maybeSingle()
      ]);
      if (!active) return;
      if (pError) setError(pError.message);
      const current = (p ?? { id: user.id, full_name: user.user_metadata?.full_name ?? "", platform_role: "user", monthly_transaction_limit: 0, avatar_url: user.user_metadata?.avatar_url ?? null, phone: "", job_title: "", bio: "", company_name: "", company_website: "", timezone: "Africa/Lagos" }) as Profile;
      setProfile(current); setName(current.full_name ?? ""); setPhone(current.phone ?? ""); setJobTitle(current.job_title ?? "");
      setBio(current.bio ?? ""); setCompanyName(current.company_name ?? ""); setCompanyWebsite(current.company_website ?? "");
      setTimezone(current.timezone ?? "Africa/Lagos"); setEmail(user.email ?? "");
      setRole((membership as Membership | null)?.role ?? current.platform_role);
      setWorkspace((membership as Membership | null)?.organization?.name ?? "No workspace assigned");
      setLoading(false);
    }
    void load().catch(() => { if (active) { setError("Could not load your profile. Please refresh and try again."); setLoading(false); } });
    return () => { active = false; };
  }, [router]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const cleanedName = name.trim();
    if (cleanedName.length < 2 || cleanedName.length > 120) { setError("Your name must be between 2 and 120 characters."); return; }
    if (phone.length > 40 || jobTitle.length > 120 || bio.length > 500 || companyName.length > 160) { setError("One or more fields are longer than allowed. Please shorten them."); return; }
    if (companyWebsite.trim() && !/^https?:\/\//i.test(companyWebsite.trim())) { setError("Company website must start with https:// or http://."); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Please sign in again.");
      const updates = { full_name: cleanedName, phone: phone.trim() || null, job_title: jobTitle.trim() || null, bio: bio.trim() || null, company_name: companyName.trim() || null, company_website: companyWebsite.trim() || null, timezone };
      const { error: updateError } = await supabase.from("bi_profiles").update(updates).eq("id", user.id);
      if (updateError) throw updateError;
      const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: cleanedName } });
      if (metaError) throw metaError;
      setProfile(p => p ? { ...p, ...updates } : p);
      setMessage("Your profile has been saved successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your profile."); }
    finally { setSaving(false); }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setError(""); setMessage("");
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { setError("Choose a JPG, PNG or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Your profile picture must be 5 MB or smaller."); return; }
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Please sign in again.");
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = user.id + "/" + Date.now() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("businessiq-avatars").upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("businessiq-avatars").getPublicUrl(path);
      const avatarUrl = data.publicUrl;
      const { error: saveError } = await supabase.from("bi_profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
      if (saveError) throw saveError;
      const { error: metaError } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
      if (metaError) throw metaError;
      setProfile(p => p ? { ...p, avatar_url: avatarUrl } : p);
      setMessage("Profile picture updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not upload your profile picture."); }
    finally { setUploading(false); }
  }

  const initials = (name || email.split("@")[0] || "BI").trim().split(/\s+/).slice(0,2).map(part => part[0]?.toUpperCase()).join("") || "BI";
  if (loading) return <main className="profile-page"><div className="profile-loading"><LoaderCircle className="spin" size={24}/><p>Loading your profile…</p></div></main>;

  return <main className="profile-page">
    <div className="profile-page-top"><Link href="/" className="back-link"><ArrowLeft size={16}/> Dashboard</Link><span className="auth-secure"><ShieldCheck size={15}/> Your account is private</span></div>
    <div className="profile-layout">
      <aside className="profile-sidebar">
        <div className="profile-side-heading"><span className="profile-side-icon"><UserRound size={18}/></span><div><strong>Account centre</strong><small>Personal profile & preferences</small></div></div>
        <a className="profile-side-link active" href="#personal"><UserRound size={17}/> Personal information</a>
        <a className="profile-side-link" href="#company"><Building2 size={17}/> Company & workspace</a>
        <a className="profile-side-link" href="#preferences"><Settings2 size={17}/> Preferences</a>
        <Link className="profile-side-link" href="/settings"><ShieldCheck size={17}/> Security settings</Link>
        <div className="profile-side-note"><ShieldCheck size={17}/><p>Your access role and usage limit are managed securely. You cannot increase your own limit.</p></div>
      </aside>

      <section className="profile-main">
        <div className="profile-heading"><div><span className="tool-eyebrow">BUSINESSIQ ACCOUNT</span><h1>My profile</h1><p>Make your account yours. Keep your details current and connect your professional identity to your workspace.</p></div><span className="profile-role-pill">{role.replaceAll("_"," ")}</span></div>

        <section className="profile-hero-card">
          <div className="profile-hero-avatar">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="Your profile" /> : <span>{initials}</span>}
            <label className={"avatar-upload-button" + (uploading ? " is-uploading" : "")} title="Upload profile picture">
              {uploading ? <LoaderCircle className="spin" size={16}/> : <Camera size={16}/>}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={uploading} aria-label="Upload profile picture"/>
            </label>
          </div>
          <div className="profile-hero-copy"><h2>{name.trim() || "Your name"}</h2><p>{jobTitle.trim() || "Add your job title"}{companyName.trim() ? " · " + companyName.trim() : ""}</p><span><CheckCircle2 size={14}/> {email}</span></div>
          <label className="profile-upload-cta"><Camera size={15}/>{uploading ? "Uploading…" : "Change photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={uploading}/></label>
        </section>

        <form onSubmit={save}>
          <section className="profile-form-card" id="personal">
            <div className="profile-card-heading"><div className="profile-card-icon"><UserRound size={18}/></div><div><h2>Personal information</h2><p>These details identify you across BusinessIQ.</p></div></div>
            <div className="profile-form-grid">
              <label className="profile-field">Full name<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Victor Avannah" autoComplete="name"/></label>
              <label className="profile-field">Email address<input value={email} readOnly/><small>To change your sign-in email, use Security settings.</small></label>
              <label className="profile-field">Phone number<input type="tel" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+234 800 000 0000" autoComplete="tel"/></label>
              <label className="profile-field">Job title / role<input maxLength={120} value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder="e.g. Operations Manager" autoComplete="organization-title"/></label>
              <label className="profile-field profile-field-full">Short bio<textarea rows={3} maxLength={500} value={bio} onChange={e=>setBio(e.target.value)} placeholder="A short introduction about your role or what you do…"/><small>{bio.length}/500 characters</small></label>
            </div>
          </section>

          <section className="profile-form-card" id="company">
            <div className="profile-card-heading"><div className="profile-card-icon"><Building2 size={18}/></div><div><h2>Company & workspace</h2><p>Present your professional details and see the business workspace connected to your account.</p></div></div>
            <div className="connected-workspace"><span className="workspace-connected-icon"><Building2 size={20}/></span><div><small>CONNECTED WORKSPACE</small><strong>{workspace}</strong><p>{workspace === "No workspace assigned" ? "No company workspace is connected to this account yet." : "Your account is linked to this workspace through your membership."}</p></div><Link href={workspace === "No workspace assigned" ? "/onboarding" : "/"}>{workspace === "No workspace assigned" ? "Connect workspace" : "Open workspace"}</Link></div>
            <div className="profile-form-grid">
              <label className="profile-field">Company / organisation<input maxLength={160} value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Your company name"/></label>
              <label className="profile-field">Company website<input type="url" maxLength={300} value={companyWebsite} onChange={e=>setCompanyWebsite(e.target.value)} placeholder="https://company.com"/><small>Optional — add your organisation’s public website.</small></label>
            </div>
          </section>

          <section className="profile-form-card" id="preferences">
            <div className="profile-card-heading"><div className="profile-card-icon"><MapPin size={18}/></div><div><h2>Regional preferences</h2><p>Choose the time zone used for your working context.</p></div></div>
            <div className="profile-form-grid">
              <label className="profile-field">Time zone<select value={timezone} onChange={e=>setTimezone(e.target.value)}>{timezones.map(t=><option key={t} value={t}>{t.replaceAll("_"," ")}</option>)}</select></label>
              <div className="profile-field"><span>Account access</span><div className="profile-readonly">{role.replaceAll("_"," ")}<small>Assigned by your workspace or platform administrator.</small></div></div>
              <div className="profile-field"><span>Monthly transaction limit</span><div className="profile-readonly">{profile?.monthly_transaction_limit ? profile.monthly_transaction_limit.toLocaleString()+" transactions" : "Unlimited"}<small>Administrator-managed. This field cannot be edited here.</small></div></div>
            </div>
          </section>
          {error && <div className="auth-error" role="alert">{error}</div>}
          {message && <div className="auth-success" role="status">{message}</div>}
          <div className="profile-save-bar"><span>Your changes are private to your account and workspace permissions.</span><button className="auth-submit" type="submit" disabled={saving}>{saving ? "Saving changes…" : "Save profile changes"}</button></div>
        </form>
      </section>
    </div>
  </main>;
}
