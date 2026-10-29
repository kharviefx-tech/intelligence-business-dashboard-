"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Camera, Check, ChevronDown, Globe2, Mail, MapPin,
  ShieldCheck, UserRound, BriefcaseBusiness, Clock3, Save, Settings2, Upload, X
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  platform_role: string;
  monthly_transaction_limit: number;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  bio: string | null;
  company_name: string | null;
  company_website: string | null;
  timezone: string | null;
  preferred_organization_id: string | null;
};
type Organization = { id: string; name: string; currency: string; plan: string; role: string };

const timezones = [
  "Africa/Lagos", "Africa/Accra", "Europe/London", "Europe/Paris",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "UTC",
];

const blankProfile = (id: string): Profile => ({
  id, full_name: "", platform_role: "user", monthly_transaction_limit: 0,
  avatar_url: null, phone: null, job_title: null, bio: null, company_name: null,
  company_website: null, timezone: "Africa/Lagos", preferred_organization_id: null,
});

export default function ProfilePage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [preferredOrg, setPreferredOrg] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [role, setRole] = useState("user");
  const [workspace, setWorkspace] = useState("No workspace assigned");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.replace("/login"); return; }
      const [{ data: p, error: pError }, { data: memberships, error: membershipError }] = await Promise.all([
        supabase.from("bi_profiles")
          .select("id,full_name,platform_role,monthly_transaction_limit,avatar_url,phone,job_title,bio,company_name,company_website,timezone,preferred_organization_id")
          .eq("id", user.id).maybeSingle(),
        supabase.from("bi_organization_members")
          .select("organization_id,role,organization:bi_organizations(id,name,currency,plan)")
          .eq("user_id", user.id),
      ]);
      if (!active) return;
      if (pError) setError(pError.message);
      if (membershipError) setError(membershipError.message);
      const current = { ...blankProfile(user.id), ...(p ?? {}) } as Profile;
      const orgRows = (memberships ?? []).flatMap((m: any) => {
        const org = Array.isArray(m.organization) ? m.organization[0] : m.organization;
        return org ? [{ id: org.id, name: org.name, currency: org.currency, plan: org.plan, role: m.role }] : [];
      }) as Organization[];
      setProfile(current);
      setName(current.full_name ?? user.user_metadata?.full_name ?? "");
      setEmail(user.email ?? "");
      setPhone(current.phone ?? "");
      setJobTitle(current.job_title ?? "");
      setBio(current.bio ?? "");
      setCompanyName(current.company_name ?? "");
      setCompanyWebsite(current.company_website ?? "");
      setTimezone(current.timezone ?? "Africa/Lagos");
      setAvatarUrl(current.avatar_url ?? user.user_metadata?.avatar_url ?? "");
      setRole(current.platform_role ?? "user");
      setOrganizations(orgRows);
      const selected = orgRows.some(o => o.id === current.preferred_organization_id)
        ? current.preferred_organization_id!
        : (orgRows[0]?.id ?? "");
      setPreferredOrg(selected);
      setWorkspace(orgRows.find(o => o.id === selected)?.name ?? "No workspace connected");
      setLoading(false);
    }
    void load().catch(() => { if (active) { setError("Could not load your profile. Please refresh and try again."); setLoading(false); } });
    return () => { active = false; };
  }, [router]);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image."); event.target.value = ""; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Your profile picture must be 5 MB or smaller."); event.target.value = ""; return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const cleaned = name.trim();
    if (cleaned.length < 2 || cleaned.length > 120) { setError("Your name must be between 2 and 120 characters."); return; }
    if (phone.trim().length > 40) { setError("Phone number must be 40 characters or fewer."); return; }
    if (jobTitle.trim().length > 120) { setError("Job title must be 120 characters or fewer."); return; }
    if (bio.trim().length > 500) { setError("Your introduction must be 500 characters or fewer."); return; }
    let normalizedWebsite = companyWebsite.trim();
    if (normalizedWebsite && !/^https?:\/\//i.test(normalizedWebsite)) normalizedWebsite = "https://" + normalizedWebsite;
    if (normalizedWebsite) {
      try { new URL(normalizedWebsite); } catch { setError("Enter a valid company website, such as https://example.com."); return; }
    }
    if (preferredOrg && !organizations.some(o => o.id === preferredOrg)) { setError("Choose a workspace you already belong to."); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Your session has expired. Please sign in again.");
      let nextAvatar = avatarUrl;
      if (selectedImage) {
        const extension = selectedImage.type === "image/png" ? "png" : selectedImage.type === "image/webp" ? "webp" : "jpg";
        const path = user.id + "/" + Date.now() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("businessiq-avatars")
          .upload(path, selectedImage, { contentType: selectedImage.type, cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("businessiq-avatars").getPublicUrl(path);
        nextAvatar = publicData.publicUrl;
      }
      const payload = {
        full_name: cleaned, avatar_url: nextAvatar || null, phone: phone.trim() || null,
        job_title: jobTitle.trim() || null, bio: bio.trim() || null,
        company_name: companyName.trim() || null, company_website: normalizedWebsite || null,
        timezone, preferred_organization_id: preferredOrg || null,
      };
      const { error: updateError } = await supabase.from("bi_profiles").update(payload).eq("id", user.id);
      if (updateError) throw updateError;
      const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: cleaned, avatar_url: nextAvatar || null } });
      if (metadataError) throw metadataError;
      setAvatarUrl(nextAvatar); setImagePreview(""); setSelectedImage(null);
      setProfile(p => p ? { ...p, ...payload } : p);
      setWorkspace(organizations.find(o => o.id === preferredOrg)?.name ?? "No workspace connected");
      setMessage("Your profile and workspace preferences have been saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile. Please try again.");
    } finally { setSaving(false); }
  }

  if (loading) return <main className="profile-page"><section className="profile-loading">Loading your BusinessIQ profile…</section></main>;

  const displayAvatar = imagePreview || avatarUrl;
  const initials = (name.trim() || email.split("@")[0] || "BI").split(/\s+/).slice(0, 2).map(v => v[0]).join("").toUpperCase();

  return <main className="profile-page">
    <header className="profile-topbar">
      <Link href="/" className="profile-back"><ArrowLeft size={17}/> Dashboard</Link>
      <Link href="/settings" className="profile-top-settings"><Settings2 size={16}/> Account settings</Link>
    </header>
    <div className="profile-layout">
      <section className="profile-heading">
        <div className="profile-heading-copy">
          <span className="profile-kicker">ACCOUNT CENTRE</span>
          <h1>My profile</h1>
          <p>Make your BusinessIQ account yours. Update your details, add a photo, and connect to your company workspace.</p>
        </div>
        <span className="profile-secure-badge"><ShieldCheck size={15}/> Private account <span className="profile-secure-dot" aria-hidden="true" /></span>
      </section>

      <section className="profile-hero-card">
        <div className="profile-photo-wrap">
          <button type="button" className="profile-photo-button" onClick={() => fileInput.current?.click()} aria-label="Upload or change profile picture">
            {displayAvatar ? <img src={displayAvatar} alt="Your profile" /> : <span className="profile-initials">{initials}</span>}
            <span className="profile-photo-camera"><Camera size={17}/></span>
          </button>
          <input ref={fileInput} className="profile-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />
        </div>
        <div className="profile-hero-info">
          <h2>{name.trim() || "Your name"}</h2>
          <p>{jobTitle.trim() || "Add your job title"}{companyName.trim() ? " · " + companyName.trim() : ""}</p>
          <div className="profile-badges"><span><ShieldCheck size={13}/> Platform access · {role.replaceAll("_", " ")}</span><span><Building2 size={13}/> {organizations.find(o => o.id === preferredOrg) ? `${workspace} · ${organizations.find(o => o.id === preferredOrg)?.role.replaceAll("_", " ")}` : workspace}</span></div>
        </div>
        <button type="button" className="profile-upload-button" onClick={() => fileInput.current?.click()}><Upload size={15}/> {selectedImage ? "Change photo" : "Upload photo"}</button>
      </section>

      <form className="profile-form" onSubmit={save}>
        <section className="profile-section-card">
          <div className="profile-section-heading"><div className="profile-section-icon"><UserRound size={18}/></div><div><h2>Personal information</h2><p>How your name and details appear across your workspace.</p></div></div>
          <div className="profile-form-grid">
            <label className="profile-field"><span>Full name <b>*</b></span><input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Avannah Victor" autoComplete="name"/></label>
            <label className="profile-field"><span>Sign-in email</span><div className="profile-input-icon"><Mail size={16}/><input value={email} readOnly aria-readonly="true"/></div><small>Email changes are managed in account settings.</small></label>
            <label className="profile-field"><span>Phone number</span><input type="tel" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+234 800 000 0000" autoComplete="tel"/></label>
            <label className="profile-field"><span>Job title / role</span><input maxLength={120} value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder="e.g. Operations Manager" autoComplete="organization-title"/></label>
            <label className="profile-field profile-field-wide"><span>Short introduction <small>Optional · up to 500 characters</small></span><textarea rows={4} maxLength={500} value={bio} onChange={e=>setBio(e.target.value)} placeholder="A short introduction about you and what you do…"/><small className="profile-character-count">{bio.length}/500</small></label>
          </div>
        </section>

        <section className="profile-section-card">
          <div className="profile-section-heading"><div className="profile-section-icon"><Building2 size={18}/></div><div><h2>Company &amp; workspace</h2><p>Connect your profile to an existing company workspace you already belong to.</p></div></div>
          <div className="profile-form-grid">
            <label className="profile-field profile-field-wide"><span>Connected workspace</span><div className="profile-select-wrap"><select value={preferredOrg} onChange={e=>setPreferredOrg(e.target.value)}><option value="">No preferred workspace</option>{organizations.map(o=><option key={o.id} value={o.id}>{o.name} · {o.role.replaceAll("_"," ")}</option>)}</select><ChevronDown size={16}/></div>{organizations.length ? <small>Only workspaces you are already a member of are available here. Your membership and access permissions are not changed.</small> : <small>You are not currently a member of a company workspace. Ask your company administrator to invite you, or create a workspace from the dashboard.</small>}</label>
            <label className="profile-field"><span>Company name</span><input maxLength={160} value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Your company or organisation"/></label>
            <label className="profile-field"><span>Company website</span><div className="profile-input-icon"><Globe2 size={16}/><input type="text" maxLength={300} value={companyWebsite} onChange={e=>setCompanyWebsite(e.target.value)} placeholder="https://company.com" autoComplete="url"/></div></label>
            <div className={`profile-company-summary ${preferredOrg ? "is-connected" : "is-unconnected"}`}><Building2 size={18}/><div><strong>{organizations.find(o=>o.id===preferredOrg)?.name || companyName.trim() || "No company connected"}</strong><p>{organizations.find(o=>o.id===preferredOrg) ? `Workspace membership confirmed · ${organizations.find(o=>o.id===preferredOrg)?.role.replaceAll("_", " ")} access. Your permissions are managed separately.` : "Company details are saved to your profile only. Choose an existing workspace to connect it."}</p></div>{preferredOrg ? <Check size={17}/> : <Globe2 size={17}/>}</div>
          </div>
        </section>

        <section className="profile-section-card">
          <div className="profile-section-heading"><div className="profile-section-icon"><Clock3 size={18}/></div><div><h2>Preferences &amp; access</h2><p>Set the time zone used for your account and review your access details.</p></div></div>
          <div className="profile-form-grid">
            <label className="profile-field"><span>Time zone</span><div className="profile-select-wrap"><select value={timezone} onChange={e=>setTimezone(e.target.value)}>{timezones.map(t=><option key={t} value={t}>{t.replaceAll("_"," ")}</option>)}</select><ChevronDown size={16}/></div></label>
            <div className="profile-field"><span>Platform access role</span><div className="profile-readonly-card"><ShieldCheck size={16}/><span>{role.replaceAll("_"," ")}</span></div><small>This controls access to BusinessIQ administration. Your company workspace role is shown separately above and may be different.</small></div>
            <div className="profile-field profile-field-wide"><span>Monthly transaction allowance</span><div className="profile-readonly-card"><ShieldCheck size={16}/><span>{profile?.monthly_transaction_limit ? profile.monthly_transaction_limit.toLocaleString() + " transactions per month" : "Unlimited transactions"}</span><em>Admin managed</em></div><small>This setting is read-only for users and staff. Only an administrator can change it.</small></div>
          </div>
        </section>

        {error && <div className="profile-alert profile-alert-error" role="alert"><X size={17}/>{error}</div>}
        {message && <div className="profile-alert profile-alert-success" role="status"><Check size={17}/>{message}</div>}
        <div className="profile-savebar"><div className="profile-savebar-copy"><strong>Keep your account up to date</strong><span>Your changes apply to your BusinessIQ profile. Role and transaction limits stay administrator-managed.</span></div><button type="submit" disabled={saving}><Save size={16}/>{saving ? "Saving changes…" : "Save profile changes"}</button></div>
      </form>
      <footer className="profile-footer"><span>BusinessIQ Account Centre</span><span>Profile details are private to your account and authorised workspace administrators.</span><Link href="/settings">Password &amp; sign-in settings <ArrowLeft size={13}/></Link></footer>
    </div>
  </main>;
}
