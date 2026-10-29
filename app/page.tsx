"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowDownRight, ArrowUpRight, ChevronDown, CircleHelp, Download, FileText, LayoutDashboard, LoaderCircle, LogOut, Menu, Plus, Search, Settings, ShieldCheck, ShoppingCart, Users, Wallet, X, RefreshCw, AlertCircle, Globe2, MapPin, MapPinned } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Pie, PieChart } from "recharts";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";

type Organization = { id: string; name: string; currency: string; plan: string };
type Transaction = {
  id: string; organization_id: string; transaction_date: string; description: string;
  kind: "income" | "expense"; amount: number; currency: string; category: string; status: "pending" | "recorded" | "cancelled"; sub_category?: string | null; customer_segment?: string | null; city?: string | null; region?: string | null; country?: string | null;
};
const supabase = createClient();
const allowedCurrencies = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];
const money = (n: number, currency: string) => {
  try { return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
  catch { return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(n) + " " + currency; }
};
const monthName = (date: Date) => date.toLocaleDateString("en", { month: "short" });
const initialForm = { description: "", kind: "income" as "income" | "expense", amount: "", category: "", sub_category: "", customer_segment: "", city: "", region: "", country: "", transaction_date: new Date().toISOString().slice(0, 10), status: "recorded" as "recorded" | "pending" };

export default function Home() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [platformRole, setPlatformRole] = useState("user");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [geoSchemaReady, setGeoSchemaReady] = useState(false);
  const [salesSchemaReady, setSalesSchemaReady] = useState(false);
  const [period, setPeriod] = useState("30");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/login?next=/");
        return;
      }
      setUserEmail(user.email ?? "");
      const { data: profileInfo } = await supabase.from("bi_profiles").select("full_name,avatar_url,preferred_organization_id,platform_role").eq("id", user.id).maybeSingle();
      setUserName(profileInfo?.full_name ?? user.user_metadata?.full_name ?? "");
      setUserAvatar(profileInfo?.avatar_url ?? user.user_metadata?.avatar_url ?? "");
      setPlatformRole(profileInfo?.platform_role ?? "user");
      const { data: orgs, error: orgError } = await supabase.from("bi_organizations").select("id,name,currency,plan").order("created_at", { ascending: true });
      if (orgError) throw orgError;
      const safeOrgs = (orgs ?? []) as Organization[];
      setOrganizations(safeOrgs);
      if (!safeOrgs.length) {
        setTransactions([]);
        setOrganizationId("");
        setNotice("Create your first workspace to start analysing real business activity.");
        return;
      }
      const preferredId = profileInfo?.preferred_organization_id;
      const currentId = safeOrgs.some(o => o.id === organizationId) ? organizationId : safeOrgs.some(o => o.id === preferredId) ? preferredId : safeOrgs[0].id;
      setOrganizationId(currentId);
      let rows: Transaction[] = [];
      const withAnalytics = await supabase.from("bi_transactions").select("id,organization_id,transaction_date,description,kind,amount,currency,category,status,sub_category,customer_segment,city,region,country").eq("organization_id", currentId).order("transaction_date", { ascending: false }).limit(1000);
      if (withAnalytics.error) {
        const withGeo = await supabase.from("bi_transactions").select("id,organization_id,transaction_date,description,kind,amount,currency,category,status,city,region,country").eq("organization_id", currentId).order("transaction_date", { ascending: false }).limit(1000);
        if (withGeo.error) {
          const base = await supabase.from("bi_transactions").select("id,organization_id,transaction_date,description,kind,amount,currency,category,status").eq("organization_id", currentId).order("transaction_date", { ascending: false }).limit(1000);
          if (base.error) throw base.error;
          rows = (base.data ?? []).map((t: any) => ({ ...t, sub_category: null, customer_segment: null, city: null, region: null, country: null })) as Transaction[];
          setGeoSchemaReady(false); setSalesSchemaReady(false);
        } else {
          rows = (withGeo.data ?? []).map((t: any) => ({ ...t, sub_category: null, customer_segment: null })) as Transaction[];
          setGeoSchemaReady(true); setSalesSchemaReady(false);
        }
      } else { rows = (withAnalytics.data ?? []) as Transaction[]; setGeoSchemaReady(true); setSalesSchemaReady(true); }
      setTransactions(rows);
      setNotice("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not load your workspace data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, router]);

  useEffect(() => { void loadData(); }, [loadData]);

  const organization = organizations.find(o => o.id === organizationId);
  const currency = organization?.currency && allowedCurrencies.includes(organization.currency) ? organization.currency : "NGN";
  const since = useMemo(() => {
    const d = new Date();
    if (period === "30") d.setDate(d.getDate() - 30);
    else if (period === "90") d.setDate(d.getDate() - 90);
    else d.setMonth(d.getMonth() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [period]);
  const periodTransactions = useMemo(() => transactions.filter(t => {
    const date = new Date(t.transaction_date + "T00:00:00");
    return date >= since && t.status !== "cancelled" && t.currency === currency;
  }), [transactions, since, currency]);
  const totals = useMemo(() => {
    const income = periodTransactions.filter(t => t.kind === "income" && t.status === "recorded").reduce((s,t) => s + Number(t.amount), 0);
    const expenses = periodTransactions.filter(t => t.kind === "expense" && t.status === "recorded").reduce((s,t) => s + Number(t.amount), 0);
    const pending = periodTransactions.filter(t => t.status === "pending").reduce((s,t) => s + Number(t.amount), 0);
    return { income, expenses, profit: income - expenses, pending, count: periodTransactions.length, margin: income > 0 ? ((income - expenses) / income) * 100 : 0 };
  }, [periodTransactions]);
  const trend = useMemo(() => {
    const now = new Date();
    const count = period === "30" ? 6 : period === "90" ? 3 : 6;
    return Array.from({ length: count }, (_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const monthRows = periodTransactions.filter(t => t.transaction_date.startsWith(key) && t.status === "recorded");
      return { month: monthName(d), revenue: monthRows.filter(t => t.kind === "income").reduce((s,t) => s + Number(t.amount), 0), expenses: monthRows.filter(t => t.kind === "expense").reduce((s,t) => s + Number(t.amount), 0) };
    });
  }, [periodTransactions, period]);
  const filtered = useMemo(() => transactions.filter(t => (t.description + " " + t.category + " " + (t.sub_category ?? "") + " " + (t.customer_segment ?? "") + " " + t.status + " " + (t.city ?? "") + " " + (t.region ?? "") + " " + (t.country ?? "")).toLowerCase().includes(query.toLowerCase())), [transactions, query]);
  const geographic = useMemo(() => { const located = periodTransactions.filter(t => Boolean((t.city ?? "").trim() || (t.region ?? "").trim() || (t.country ?? "").trim())); const groupBy = (keyOf: (t: Transaction) => string) => { const groups = new Map<string, { name: string; country: string; region: string; city: string; revenue: number; expenses: number; count: number }>(); for (const t of located) { const name = keyOf(t); if (!name) continue; const g = groups.get(name) ?? { name, country: "", region: "", city: "", revenue: 0, expenses: 0, count: 0 }; g.count += 1; if (t.status === "recorded") { if (t.kind === "income") g.revenue += Number(t.amount); else g.expenses += Number(t.amount); } g.country ||= t.country?.trim() ?? ""; g.region ||= t.region?.trim() ?? ""; g.city ||= t.city?.trim() ?? ""; groups.set(name, g); } return [...groups.values()].sort((a,b) => (b.revenue+b.expenses) - (a.revenue+a.expenses)); }; const countries = groupBy(t => (t.country ?? "").trim()); const regions = groupBy(t => [(t.region ?? "").trim(), (t.country ?? "").trim()].filter(Boolean).join(", ")); const cities = groupBy(t => [(t.city ?? "").trim(), (t.region ?? "").trim(), (t.country ?? "").trim()].filter(Boolean).join(", ")); const locatedIncome = located.filter(t => t.kind === "income" && t.status === "recorded").reduce((n,t)=>n+Number(t.amount),0); const allIncome = periodTransactions.filter(t => t.kind === "income" && t.status === "recorded").reduce((n,t)=>n+Number(t.amount),0); return { located, countries: countries.filter(g=>g.name).slice(0,6), regions: regions.filter(g=>g.name).slice(0,8), cities: cities.filter(g=>g.name).slice(0,6), countryCount: new Set(located.map(t=>(t.country??"").trim()).filter(Boolean)).size, regionCount: new Set(located.map(t=>(t.region??"").trim()).filter(Boolean)).size, cityCount: new Set(located.map(t=>(t.city??"").trim()).filter(Boolean)).size, coverage: allIncome > 0 ? Math.round(locatedIncome / allIncome * 100) : 0 }; }, [periodTransactions]);

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    if (!organizationId) { setError("Create or select a workspace first."); return; }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter an amount greater than zero."); return; }
    if (!geoSchemaReady && (form.city.trim() || form.region.trim() || form.country.trim())) { setError("Geographic fields are not enabled in the connected database yet. Apply the BusinessIQ geographic analytics migration before saving location details."); return; }
    if (!salesSchemaReady && (form.sub_category.trim() || form.customer_segment.trim())) { setError("Sales category and customer segment fields are not enabled in the connected database yet. Apply the BusinessIQ sales analytics migration before saving these details."); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Please sign in again.");
      const { error: insertError } = await supabase.from("bi_transactions").insert({
        organization_id: organizationId, created_by: user.id, description: form.description.trim(),
        kind: form.kind, amount, currency, category: form.category.trim() || "Uncategorized",
        transaction_date: form.transaction_date, status: form.status, ...(salesSchemaReady ? { sub_category: form.sub_category.trim() || null, customer_segment: form.customer_segment.trim() || null } : {}), ...(geoSchemaReady ? { city: form.city.trim() || null, region: form.region.trim() || null, country: form.country.trim() || null } : {}),
      });
      if (insertError) throw insertError;
      setForm(initialForm); setShowAdd(false);
      await loadData(true);
      setNotice("Transaction saved. Your analysis has been recalculated from workspace records.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this transaction.");
    } finally { setSaving(false); }
  }

  function exportCsv() {
    const rows = [["Date", "Description", "Category", "Sub-category", "Customer segment", "Type", "Status", "Currency", "Amount", "City", "Region/State", "Country"], ...filtered.map(t => [t.transaction_date, t.description, t.category, t.sub_category ?? "", t.customer_segment ?? "", t.kind, t.status, t.currency, String(t.amount), t.city ?? "", t.region ?? "", t.country ?? ""])];
    const csv = rows.map(row => row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "businessiq-transactions.csv"; link.click(); URL.revokeObjectURL(url);
  }

  async function signOut() { await supabase.auth.signOut(); router.replace("/login"); router.refresh(); }

  return <main className="app-shell">
    <aside className={mobileNav ? "sidebar sidebar-open" : "sidebar"}>
      <div className="brand"><div className="brand-mark">B</div><div><strong>BusinessIQ</strong><span>BUSINESS INTELLIGENCE</span></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <label className="workspace-switch"><span className="workspace-avatar">{organization?.name?.slice(0,2).toUpperCase() || "BI"}</span><span className="workspace-text"><strong>{organization?.name || "No workspace yet"}</strong><small>{organization ? organization.plan + " plan" : "Set up to begin"}</small></span>{organizations.length > 1 && <select aria-label="Select workspace" value={organizationId} onChange={e => setOrganizationId(e.target.value)}>{organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}</label>
      <div className="nav-label">ANALYTICS</div><nav className="nav-list"><a className="nav-item active" href="#overview"><LayoutDashboard size={18}/>Overview</a><a className="nav-item" href="#transactions"><Wallet size={18}/>Transactions</a><a className="nav-item" href="#performance"><Activity size={18}/>Performance</a><a className="nav-item" href="#sales-analysis"><ShoppingCart size={18}/>Sales analytics</a><a className="nav-item" href="#geography"><Globe2 size={18}/>Geographic analytics</a><a className="nav-item" href="#reports"><FileText size={18}/>Reports &amp; exports</a></nav>
      <div className="nav-label">MY ACCOUNT</div><nav className="nav-list"><Link className="nav-item" href="/profile"><Users size={18}/>My profile</Link><Link className="nav-item" href="/settings"><Settings size={18}/>Account settings</Link><Link className="nav-item" href="/help"><CircleHelp size={18}/>Help centre</Link></nav>
      {["admin","super_admin"].includes(platformRole) && <><div className="nav-label admin-nav-label"><ShieldCheck size={12}/> PRIVATE ADMIN</div><nav className="nav-list admin-nav-list"><Link className="nav-item admin-nav-item" href="/admin"><ShieldCheck size={18}/>Admin centre<span className="admin-nav-tag">ADMIN</span></Link><Link className="nav-item admin-nav-item" href="/monetization"><ShoppingCart size={18}/>Monetization<span className="admin-nav-tag">ADMIN</span></Link></nav></>}
      <div className="sidebar-bottom"><div className="secure-icon"><ShieldCheck size={18}/></div><strong>Grounded in your records.</strong><p>Metrics update from transactions you record in this workspace.</p><button className="sidebar-signout" onClick={signOut}><LogOut size={14}/> Sign out</button><Link className="profile" href="/profile"><div className="profile-avatar">{userAvatar ? <img src={userAvatar} alt="" /> : (userName || userEmail.split("@")[0] || "BI").split(/\\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase()}</div><div><strong>{userName || userEmail || "Signed-in account"}</strong><small>{userEmail || "View or edit profile"}</small></div></Link></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <section className="main-area">
      <header className="topbar"><button className="icon-btn menu-toggle" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21}/></button><div className="crumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="top-actions"><div className="searchbox"><Search size={16}/><input aria-label="Search transactions" placeholder="Search records..." value={query} onChange={e => setQuery(e.target.value)}/></div><button className="icon-btn" aria-label="Refresh analysis" onClick={() => void loadData(true)} disabled={refreshing}>{refreshing ? <LoaderCircle className="spin" size={18}/> : <RefreshCw size={18}/>}</button><Link className="top-avatar top-avatar-link" href="/profile" aria-label="Open your profile">{userAvatar ? <img src={userAvatar} alt="" /> : (userName || userEmail.split("@")[0] || "BI").split(/\\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase()}</Link></div></header>
      <div className="content" id="overview">
        <div className="welcome-row"><div><div className="eyebrow"><span className="status-dot"/> LIVE WORKSPACE ANALYTICS</div><h1>Business overview <span>✦</span></h1><p className="subheading">A clear view of income, spending and operating performance from your records.</p></div><div className="header-controls"><label className="period-select"><span className="sr-only">Reporting period</span><select value={period} onChange={e => setPeriod(e.target.value)}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 6 months</option></select><ChevronDown size={15}/></label><button className="primary-btn" onClick={() => setShowAdd(v => !v)}><Plus size={16}/> Add transaction</button><button className="subtle-btn" onClick={exportCsv}><Download size={15}/> Export</button></div></div>
        {error && <div className="data-alert error-alert" role="alert"><AlertCircle size={17}/><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={15}/></button></div>}
        {notice && <div className="data-alert success-alert" role="status"><ShieldCheck size={17}/><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={15}/></button></div>}
        {loading ? <div className="loading-panel"><LoaderCircle className="spin" size={25}/><strong>Loading your workspace</strong><span>Fetching authorised records and calculating metrics…</span></div> : <>
          {!organizations.length && <div className="empty-workspace"><div className="empty-workspace-icon"><LayoutDashboard size={24}/></div><h2>Your analysis starts with a workspace</h2><p>Set up your business workspace to securely organise transactions, calculate performance and build reports from your own records.</p><Link className="primary-btn" href="/onboarding">Create workspace <ArrowUpRight size={16}/></Link></div>}
          {!!organizations.length && <>
            <div className="data-source-strip"><span className="live-pulse"/><div><strong>Connected to Supabase</strong><small>{organization?.name} · {transactions.length.toLocaleString()} records loaded · {currency}</small></div><span className="data-label">LIVE DATA</span></div>
            <div className="metrics-grid">
              <article className="metric-card"><div className="metric-top"><span>Recorded income</span><span className="metric-icon green"><ArrowDownRight size={18}/></span></div><strong className="metric-value">{money(totals.income,currency)}</strong><div className="metric-foot muted"><span>{periodTransactions.filter(t=>t.kind==="income"&&t.status==="recorded").length} recorded entries in period</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Recorded expenses</span><span className="metric-icon orange"><ShoppingCart size={18}/></span></div><strong className="metric-value">{money(totals.expenses,currency)}</strong><div className="metric-foot muted"><span>{periodTransactions.filter(t=>t.kind==="expense"&&t.status==="recorded").length} recorded entries in period</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Net operating result</span><span className="metric-icon blue"><Activity size={18}/></span></div><strong className="metric-value">{money(totals.profit,currency)}</strong><div className={"metric-foot " + (totals.profit>=0?"positive":"negative")}><b>{totals.income ? totals.margin.toFixed(1)+"% margin" : "No income recorded"}</b><span>income less recorded expenses</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Pending transactions</span><span className="metric-icon purple"><FileText size={18}/></span></div><strong className="metric-value">{money(totals.pending,currency)}</strong><div className="metric-foot muted"><span>{periodTransactions.filter(t=>t.status==="pending").length} entries need review</span></div></article>
            </div>
            <div className="dashboard-grid"><article className="panel chart-panel" id="performance"><div className="panel-heading"><div><h2>Income &amp; expenses trend</h2><p>Monthly totals calculated from recorded transactions</p></div><span className="live-chart-badge">FROM YOUR DATA</span></div><div className="chart-legend"><span><i className="legend-revenue"/>Income</span><span><i className="legend-expenses"/>Expenses</span></div><div className="chart-wrap">{trend.some(t=>t.revenue||t.expenses) ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top:12,right:5,left:-18,bottom:0}}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#19866a" stopOpacity={.18}/><stop offset="100%" stopColor="#19866a" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9eeeb"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#829089",fontSize:12}}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#829089",fontSize:11}} tickFormatter={v=>v>=1000000?(currency==="NGN"?"₦":"")+ (v/1000000).toFixed(1)+"m":(currency==="NGN"?"₦":"")+(v/1000).toFixed(0)+"k"}/><Tooltip formatter={(v)=>money(Number(v),currency)} contentStyle={{borderRadius:12,border:"1px solid #e5ebe7",fontSize:12}}/><Area type="monotone" dataKey="revenue" name="Income" stroke="#19866a" strokeWidth={2.5} fill="url(#revenueFill)"/><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#e6a24a" strokeWidth={2.5} fill="transparent"/></AreaChart></ResponsiveContainer> : <div className="chart-empty">No recorded income or expenses in this period. Add transactions to build your trend.</div>}</div><div className="chart-caption">Cancelled entries are excluded. Pending entries are shown separately and do not affect net operating result.</div></article>
              <article className="panel health-panel"><div className="panel-heading"><div><h2>Performance signals</h2><p>Rule-based observations from this period</p></div><span className="live-chart-badge">CALCULATED</span></div><div className="signal-list">
                <div className="signal-row"><span className={totals.profit>=0?"signal-icon good":"signal-icon warn"}><Activity size={17}/></span><div><strong>{totals.income===0?"Income data needed":totals.profit>=0?"Positive operating result":"Expenses exceed income"}</strong><small>{totals.income===0?"Record income to calculate operating performance":totals.profit>=0?"Recorded income is above recorded expenses":"Review costs and revenue for this period"}</small></div></div>
                <div className="signal-row"><span className="signal-icon info"><Wallet size={17}/></span><div><strong>{totals.income ? totals.margin.toFixed(1)+"% operating margin":"Margin unavailable"}</strong><small>{totals.income ? (totals.margin>=20?"At least 20% of recorded income remains after recorded expenses":totals.margin>=0?"Keep monitoring costs relative to income":"Negative margin for selected period") : "Requires recorded income"}</small></div></div>
                <div className="signal-row"><span className={totals.pending>0?"signal-icon warn":"signal-icon good"}><FileText size={17}/></span><div><strong>{totals.pending>0?"Pending items need review":"No pending items in period"}</strong><small>{totals.pending>0?money(totals.pending,currency)+" awaiting confirmation":"All visible period entries are marked recorded or cancelled"}</small></div></div>
              </div><div className="health-disclaimer">Signals are simple calculations from your recorded data, not forecasts or professional financial advice.</div></article></div>
            <section className="geo-section" id="geography"><div className="geo-section-heading"><div><div className="eyebrow"><Globe2 size={14}/> MARKET INTELLIGENCE</div><h2>Geographic analytics</h2><p>Compare recorded business activity by country, region and city. No location is guessed or inferred.</p></div><span className="geo-period">{period === "30" ? "Last 30 days" : period === "90" ? "Last 90 days" : "Last 6 months"}</span></div>{!geoSchemaReady ? <div className="geo-setup-alert"><MapPin size={22}/><div><strong>Enable location intelligence</strong><p>Your existing transactions still work normally. Apply <code>supabase/migrations/202610290002_geographic_analytics.sql</code> to the connected database to enable location fields and geographic reporting.</p></div></div> : <><div className="geo-kpi-grid"><article className="geo-kpi"><span><Globe2 size={17}/> Countries</span><strong>{geographic.countryCount}</strong><small>Countries represented</small></article><article className="geo-kpi"><span><MapPinned size={17}/> Regions / states</span><strong>{geographic.regionCount}</strong><small>Distinct regions recorded</small></article><article className="geo-kpi"><span><MapPin size={17}/> Cities</span><strong>{geographic.cityCount}</strong><small>Distinct cities recorded</small></article><article className="geo-kpi"><span><Activity size={17}/> Revenue coverage</span><strong>{geographic.coverage}%</strong><small>Recorded income with a location</small></article></div>{geographic.located.length === 0 ? <div className="geo-empty"><div className="geo-empty-icon"><MapPinned size={24}/></div><strong>No geographic records in this period yet</strong><p>Add a city, region/state and country when recording transactions. The analytics will update from those saved records.</p><button className="primary-btn" onClick={()=>setShowAdd(true)}><Plus size={15}/> Add a located transaction</button></div> : <div className="geo-grid"><article className="panel geo-chart-panel"><div className="panel-heading"><div><h3>Activity by region</h3><p>Recorded income and expenses by region / state</p></div><span className="live-chart-badge">WORKSPACE DATA</span></div><div className="geo-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={geographic.regions} layout="vertical" margin={{top:5,right:18,left:5,bottom:0}}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="#e8edf4"/><XAxis type="number" axisLine={false} tickLine={false} tick={{fill:"#8290a0",fontSize:10}} tickFormatter={v=>v>=1000000?(v/1000000).toFixed(1)+"m":v>=1000?(v/1000).toFixed(0)+"k":String(v)}/><YAxis type="category" dataKey="name" width={105} axisLine={false} tickLine={false} tick={{fill:"#52677e",fontSize:10}}/><Tooltip formatter={(v)=>money(Number(v),currency)} contentStyle={{borderRadius:10,border:"1px solid #e1e8f0",fontSize:12}}/><Bar dataKey="revenue" name="Income" fill="#1768d2" radius={[0,5,5,0]} barSize={13}/><Bar dataKey="expenses" name="Expenses" fill="#24a486" radius={[0,5,5,0]} barSize={13}/></BarChart></ResponsiveContainer></div><div className="geo-legend"><span><i className="geo-blue-dot"/> Income</span><span><i className="geo-green-dot"/> Expenses</span></div></article><article className="panel geo-chart-panel"><div className="panel-heading"><div><h3>Market distribution</h3><p>Recorded transaction volume by country</p></div><span className="live-chart-badge">TOP MARKETS</span></div>{geographic.countries.length ? <div className="geo-country-layout"><div className="geo-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={geographic.countries} dataKey="count" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3} stroke="none">{geographic.countries.map((entry,index)=><Cell key={entry.name} fill={["#1768d2","#24a486","#e7a33e","#805ad5","#e56f7c","#36a4b6"][index%6]}/>)}</Pie><Tooltip formatter={(v)=>[String(v)+" records","Transactions"]}/></PieChart></ResponsiveContainer><div className="geo-donut-center"><strong>{geographic.located.length}</strong><span>located records</span></div></div><div className="geo-country-legend">{geographic.countries.map((c,index)=><div key={c.name}><i style={{background:["#1768d2","#24a486","#e7a33e","#805ad5","#e56f7c","#36a4b6"][index%6]}}/><span>{c.name}</span><strong>{c.count}</strong></div>)}</div></div> : <div className="geo-empty-compact">Add a country to start comparing markets.</div>}</article><article className="panel geo-table-panel"><div className="panel-heading"><div><h3>Leading cities</h3><p>Ranked by recorded income and expense volume</p></div><span className="live-chart-badge">TOP CITIES</span></div><div className="geo-city-list">{geographic.cities.map((city,index)=><div className="geo-city-row" key={city.name}><span className="geo-city-rank">{String(index+1).padStart(2,"0")}</span><span className="geo-city-marker"><MapPin size={15}/></span><div className="geo-city-copy"><strong>{city.city || city.name}</strong><small>{[city.region,city.country].filter(Boolean).join(", ") || "Location recorded"}</small></div><div className="geo-city-stats"><strong>{money(city.revenue,currency)}</strong><small>{city.count} records</small></div></div>)}</div></article><article className="panel geo-insight-panel"><div className="panel-heading"><div><h3>Location data quality</h3><p>Coverage checks for this reporting period</p></div><span className="live-chart-badge">DATA QUALITY</span></div><div className="geo-quality-row"><span>Transactions with a location</span><strong>{geographic.located.length} / {periodTransactions.length}</strong></div><div className="geo-quality-track"><span style={{width: periodTransactions.length ? `${Math.round(geographic.located.length / periodTransactions.length * 100)}%` : "0%"}}/></div><div className="geo-quality-row"><span>Country coverage</span><strong>{periodTransactions.length ? Math.round(periodTransactions.filter(t=>(t.country??"").trim()).length / periodTransactions.length * 100) : 0}%</strong></div><div className="geo-quality-row"><span>Region coverage</span><strong>{periodTransactions.length ? Math.round(periodTransactions.filter(t=>(t.region??"").trim()).length / periodTransactions.length * 100) : 0}%</strong></div><div className="geo-quality-row"><span>City coverage</span><strong>{periodTransactions.length ? Math.round(periodTransactions.filter(t=>(t.city??"").trim()).length / periodTransactions.length * 100) : 0}%</strong></div><p className="geo-quality-note">Geography is based only on the locations entered in your records. BusinessIQ does not guess locations from names or descriptions.</p></article></div>}</>}</section><article className="panel transactions-panel" id="transactions"><div className="panel-heading" id="reports"><div><h2>Transaction ledger</h2><p>Search and export the records available to your workspace</p></div><button className="subtle-btn" onClick={exportCsv}><Download size={14}/> Export CSV</button></div><div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>STATUS</th><th className="align-right">AMOUNT</th></tr></thead><tbody>{filtered.slice(0,100).map(t=><tr key={t.id}><td><div className="transaction-name"><span className={t.kind==="income"?"transaction-icon income":"transaction-icon expense"}>{t.kind==="income"?<ArrowDownRight size={16}/>:<ArrowUpRight size={16}/>}</span><strong>{t.description}</strong></div></td><td>{t.category||"Uncategorized"}</td><td>{new Date(t.transaction_date+"T00:00:00").toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</td><td><span className={"status-badge "+(t.status==="recorded"?"recorded":"pending")}>{t.status}</span></td><td className={"align-right amount "+(t.kind==="income"?"amount-in":"")}>{t.kind==="income"?"+":"−"}{money(Number(t.amount),t.currency)}</td></tr>)}</tbody></table>{filtered.length===0&&<div className="empty-state">{query?"No transactions match your search.":"No transactions yet. Add your first record to begin analysis."}</div>}</div><div className="table-footer">Showing {Math.min(filtered.length,100)} of {filtered.length} matching records <span>Workspace-scoped data</span></div></article>
          </>}
        </>}
        <footer className="footer"><span>BusinessIQ · Business intelligence workspace</span><span>Metrics are calculated from authorised workspace records</span>{["admin","super_admin"].includes(platformRole) && <Link href="/admin">Admin centre</Link>}<Link href="/help">Help &amp; support</Link></footer>
      </div>
    </section>
    {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}><section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="add-transaction-title"><div className="modal-heading"><div><h2 id="add-transaction-title">Add transaction</h2><p>Record a real entry in {organization?.name || "your workspace"}.</p></div><button className="icon-btn" onClick={()=>setShowAdd(false)} aria-label="Close"><X size={19}/></button></div><form onSubmit={addTransaction}><label>Description<input required maxLength={240} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. Customer payment"/></label><div className="form-two"><label>Type<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as "income"|"expense"})}><option value="income">Income</option><option value="expense">Expense</option></select></label><label>Amount ({currency})<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></label></div><div className="form-two"><label>Date<input required type="date" value={form.transaction_date} onChange={e=>setForm({...form,transaction_date:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as "recorded"|"pending"})}><option value="recorded">Recorded</option><option value="pending">Pending</option></select></label></div><label>Category<input maxLength={120} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="e.g. Product sales, Services, Marketing"/></label><div className="form-two"><label>Sub-category<input maxLength={120} value={form.sub_category} onChange={e=>setForm({...form,sub_category:e.target.value})} placeholder="e.g. Phones, Chairs, Software"/></label><label>Customer segment<select value={form.customer_segment} onChange={e=>setForm({...form,customer_segment:e.target.value})}><option value="">Not specified</option><option value="Consumer">Consumer</option><option value="Corporate">Corporate</option><option value="Small business">Small business</option><option value="Enterprise">Enterprise</option><option value="Government">Government</option><option value="Home office">Home office</option><option value="Other">Other</option></select></label></div><div className="geo-form-heading"><MapPin size={15}/> Geographic details <span>Optional</span></div><div className="form-two"><label>City<input maxLength={100} value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="e.g. Lagos"/></label><label>State / region<input maxLength={100} value={form.region} onChange={e=>setForm({...form,region:e.target.value})} placeholder="e.g. Lagos State"/></label></div><label>Country<input maxLength={100} value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="e.g. Nigeria"/></label><div className="modal-note"><ShieldCheck size={15}/> Saved securely to this workspace. Your dashboard totals and trend will update after saving.</div><div className="modal-actions"><button type="button" className="subtle-btn" onClick={()=>setShowAdd(false)}>Cancel</button><button className="primary-btn" type="submit" disabled={saving}>{saving?<><LoaderCircle className="spin" size={15}/> Saving…</>:<><Plus size={15}/> Save transaction</>}</button></div></form></section></div>}
  </main>;
}
