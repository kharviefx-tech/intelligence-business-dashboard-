"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, ArrowDownRight, ArrowUpRight, Bell, ChevronDown, CircleHelp, Download, FileSpreadsheet, FileText, LayoutDashboard, LoaderCircle, LogOut, Menu, Plus, Search, Settings, ShieldCheck, ShoppingCart, Users, Wallet, X, RefreshCw, AlertCircle } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import BusinessIQAssistant from "./components/businessiq-assistant";

type Organization = { id: string; name: string; currency: string; plan: string };
type Transaction = {
  id: string; organization_id: string; transaction_date: string; description: string;
  kind: "income" | "expense"; amount: number; currency: string; category: string; status: "pending" | "recorded" | "cancelled";
};
const supabase = createClient();
const allowedCurrencies = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];
const money = (n: number, currency: string) => {
  try { return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
  catch { return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(n) + " " + currency; }
};
const monthName = (date: Date) => date.toLocaleDateString("en", { month: "short" });
const initialForm = { description: "", kind: "income" as "income" | "expense", amount: "", category: "", transaction_date: new Date().toISOString().slice(0, 10), status: "recorded" as "recorded" | "pending" };

export default function Home() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [platformRole, setPlatformRole] = useState("user");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

  const loadData = useCallback(async (quiet = false, targetOrganizationId?: string) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const requestedOrganizationId = targetOrganizationId ?? organizationId;
      const dashboardResponse = await fetch("/api/dashboard" + (requestedOrganizationId ? "?organization_id=" + encodeURIComponent(requestedOrganizationId) : ""), { cache: "no-store" });
      const dashboardData = await dashboardResponse.json();
      if (dashboardResponse.status === 401) {
        router.replace("/login?next=/");
        return;
      }
      if (!dashboardResponse.ok) throw new Error(dashboardData.error || "Unable to load your workspace.");
      const profileInfo = dashboardData.profile;
      setUserEmail(dashboardData.email ?? "");
      setUserName(profileInfo?.full_name ?? "");
      setUserAvatar(profileInfo?.avatar_url ?? "");
      setPlatformRole(profileInfo?.platform_role ?? "user");
      const safeOrgs = (dashboardData.workspaces ?? []) as Organization[];
      setOrganizations(safeOrgs);
      if (!safeOrgs.length) {
        setTransactions([]);
        setOrganizationId("");
        setNotice("Create your first workspace to start analysing real business activity.");
        return;
      }
      const preferredId = profileInfo?.preferred_organization_id;
      const currentId = safeOrgs.some((o: Organization) => o.id === requestedOrganizationId) ? requestedOrganizationId : safeOrgs.some((o: Organization) => o.id === preferredId) ? preferredId : safeOrgs[0].id;
      setOrganizationId(currentId);
      setTransactions((dashboardData.transactions ?? []) as Transaction[]);
      setNotice("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not load your workspace data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, router]);

  const hasBootstrapped = useRef(false);
  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    void loadData();
  }, [loadData]);

  const organization = organizations.find(o => o.id === organizationId);
  const currency = organization?.currency && allowedCurrencies.includes(organization.currency) ? organization.currency : "NGN";
  const since = useMemo(() => {
    const d = new Date();
    if (period === "30") d.setDate(d.getDate() - 29);
    else if (period === "90") d.setDate(d.getDate() - 89);
    else d.setDate(d.getDate() - 179);
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
    if (period === "30") {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return Array.from({ length: 5 }, (_, index) => {
        const bucketStart = new Date(start);
        bucketStart.setDate(start.getDate() + index * 6);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketEnd.getDate() + 6);
        const rows = periodTransactions.filter(t => {
          const date = new Date(t.transaction_date + "T00:00:00");
          return date >= bucketStart && date < bucketEnd && t.status === "recorded";
        });
        return {
          month: bucketStart.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
          revenue: rows.filter(t => t.kind === "income").reduce((sum,t) => sum + Number(t.amount), 0),
          expenses: rows.filter(t => t.kind === "expense").reduce((sum,t) => sum + Number(t.amount), 0),
        };
      });
    }
    const count = period === "90" ? 3 : 6;
    const now = new Date();
    return Array.from({ length: count }, (_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const monthRows = periodTransactions.filter(t => t.transaction_date.startsWith(key) && t.status === "recorded");
      return { month: monthName(d), revenue: monthRows.filter(t => t.kind === "income").reduce((sum,t) => sum + Number(t.amount), 0), expenses: monthRows.filter(t => t.kind === "expense").reduce((sum,t) => sum + Number(t.amount), 0) };
    });
  }, [periodTransactions, period]);
  const filtered = useMemo(() => transactions.filter(t => (t.description + " " + t.category + " " + t.status).toLowerCase().includes(query.toLowerCase())), [transactions]);
  const expenseBreakdown = useMemo(() => {
    const groups = new Map<string, number>();
    periodTransactions.filter(t => t.kind === "expense" && t.status === "recorded").forEach(t => {
      const label = t.category?.trim() || "Uncategorized";
      groups.set(label, (groups.get(label) ?? 0) + Number(t.amount));
    });
    return Array.from(groups, ([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [periodTransactions]);
  const largestExpenseCategory = expenseBreakdown[0]?.amount ?? 0;

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    if (!organizationId) { setError("Create or select a workspace first."); return; }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter an amount greater than zero."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId, description: form.description.trim(), kind: form.kind,
          amount, currency, category: form.category.trim() || "Uncategorized",
          transaction_date: form.transaction_date, status: form.status,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this transaction.");
      setForm(initialForm); setShowAdd(false);
      await loadData(true);
      setNotice("Transaction saved. Your analysis has been recalculated from workspace records.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this transaction.");
    } finally { setSaving(false); }
  }

  function exportCsv() {
    const rows = [["Date", "Description", "Category", "Type", "Status", "Currency", "Amount"], ...filtered.map(t => [t.transaction_date, t.description, t.category, t.kind, t.status, t.currency, String(t.amount)])];
    const csv = rows.map(row => row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "businessiq-transactions.csv"; link.click(); URL.revokeObjectURL(url);
  }

  async function signOut() { await supabase.auth.signOut(); router.replace("/login"); router.refresh(); }

  return <main className="app-shell"><BusinessIQAssistant organizationId={organizationId} period={period} />
    <aside className={mobileNav ? "sidebar sidebar-open" : "sidebar"}>
      <div className="brand"><div className="brand-mark">B</div><div><strong>BusinessIQ</strong><span>BUSINESS INTELLIGENCE</span></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <label className="workspace-switch"><span className="workspace-avatar">{organization?.name?.slice(0,2).toUpperCase() || "BI"}</span><span className="workspace-text"><strong>{organization?.name || "No workspace yet"}</strong><small>{organization ? organization.plan + " plan" : "Set up to begin"}</small></span>{organizations.length > 1 && <select aria-label="Select workspace" value={organizationId} onChange={e => { const nextId = e.target.value; setOrganizationId(nextId); void loadData(true, nextId); }}>{organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}</label>
      <div className="nav-label">ANALYTICS</div><nav className="nav-list"><a className="nav-item active" href="#overview"><LayoutDashboard size={18}/>Overview</a><a className="nav-item" href="#analytics"><Activity size={18}/>Analytics report</a><a className="nav-item" href="#transactions"><Wallet size={18}/>Transactions</a><a className="nav-item" href="#performance"><Activity size={18}/>Performance trend</a><a className="nav-item" href="#reports"><FileText size={18}/>Reports &amp; exports</a><Link className="nav-item" href="/import"><FileSpreadsheet size={18}/>Import business data</Link></nav>
      <div className="nav-label">CONNECTED WORKSPACE</div><nav className="nav-list"><Link className="nav-item" href="/integrations"><Activity size={18}/>Microsoft 365</Link></nav>
      <div className="nav-label">MY ACCOUNT</div><nav className="nav-list"><Link className="nav-item" href="/subscription"><Wallet size={18}/>Plans &amp; billing</Link><Link className="nav-item" href="/profile"><Users size={18}/>My profile</Link><Link className="nav-item" href="/settings"><Settings size={18}/>Account settings</Link><Link className="nav-item" href="/help"><CircleHelp size={18}/>Help centre</Link></nav>
      {["admin","super_admin"].includes(platformRole) && <><div className="nav-label admin-nav-label"><ShieldCheck size={12}/> PRIVATE ADMIN</div><nav className="nav-list admin-nav-list"><Link className="nav-item admin-nav-item" href="/admin"><ShieldCheck size={18}/>Admin centre<span className="admin-nav-tag">ADMIN</span></Link><Link className="nav-item admin-nav-item" href="/monetization"><ShoppingCart size={18}/>Monetization<span className="admin-nav-tag">ADMIN</span></Link></nav></>}
      <div className="sidebar-bottom"><div className="secure-icon"><ShieldCheck size={18}/></div><strong>Grounded in your records.</strong><p>Metrics update from transactions you record in this workspace.</p><button className="sidebar-signout" onClick={signOut}><LogOut size={14}/> Sign out</button><Link className="profile" href="/profile"><div className="profile-avatar">{userAvatar ? <img src={userAvatar} alt="" /> : (userName || userEmail.split("@")[0] || "BI").split(/\\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase()}</div><div><strong>{userName || userEmail || "Signed-in account"}</strong><small>{userEmail || "View or edit profile"}</small></div></Link></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <section className="main-area">
      <header className="topbar"><button className="icon-btn menu-toggle" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21}/></button><div className="crumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="top-actions"><div className="searchbox"><Search size={16}/><input aria-label="Search transactions" placeholder="Search records..." value={query} onChange={e => setQuery(e.target.value)}/></div><button className="icon-btn" aria-label="Refresh analysis" onClick={() => void loadData(true)} disabled={refreshing}>{refreshing ? <LoaderCircle className="spin" size={18}/> : <RefreshCw size={18}/>}</button><Link className="top-avatar top-avatar-link" href="/profile" aria-label="Open your profile">{userAvatar ? <img src={userAvatar} alt="" /> : (userName || userEmail.split("@")[0] || "BI").split(/\\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase()}</Link></div></header>
      <div className="pbi-commandbar" aria-label="Report workspace toolbar">
        <nav className="pbi-command-tabs" aria-label="Workspace commands"><a className="pbi-command-active" href="#overview">Home</a><a href="#transactions">Insert</a><a href="/settings">Model</a><a href="#analytics">View</a><a href="/help">Help</a></nav>
        <div className="pbi-command-tools"><span className="pbi-command-product"><i/> REPORT VIEW</span><span className="pbi-command-divider"/><span>Data source: Workspace ledger</span><span className="pbi-command-live"><i/> Up to date</span></div>
      </div>
      <div className="content" id="overview">
        <div className="welcome-row"><div><div className="eyebrow"><span className="status-dot"/> LIVE WORKSPACE ANALYTICS</div><h1>Business overview <span>✦</span></h1><p className="subheading">A clear view of income, spending and operating performance from your records.</p></div><div className="header-controls"><label className="period-select"><span className="sr-only">Reporting period</span><select value={period} onChange={e => setPeriod(e.target.value)}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 6 months</option></select><ChevronDown size={15}/></label><button className="primary-btn" onClick={() => setShowAdd(v => !v)}><Plus size={16}/> Add transaction</button><button className="subtle-btn" onClick={exportCsv}><Download size={15}/> Export</button></div></div>
        {error && <div className="data-alert error-alert" role="alert"><AlertCircle size={17}/><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={15}/></button></div>}
        {notice && <div className="data-alert success-alert" role="status"><ShieldCheck size={17}/><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={15}/></button></div>}
        {loading ? <div className="loading-panel"><LoaderCircle className="spin" size={25}/><strong>Loading your workspace</strong><span>Fetching authorised records and calculating metrics…</span></div> : <>
          {!organizations.length && <div className="empty-workspace"><div className="empty-workspace-icon"><LayoutDashboard size={24}/></div><h2>Your analysis starts with a workspace</h2><p>Set up your business workspace to securely organise transactions, calculate performance and build reports from your own records.</p><Link className="primary-btn" href="/onboarding">Create workspace <ArrowUpRight size={16}/></Link></div>}
          {!!organizations.length && <>
            <div className="metrics-grid finance-kpis">
              <article className="metric-card metric-card-primary"><div className="metric-top"><span>Net operating result</span><span className="metric-icon blue"><Activity size={18}/></span></div><strong className="metric-value">{money(totals.profit,currency)}</strong><div className={"metric-foot " + (totals.profit>=0?"positive":"negative")}><b>{totals.income ? totals.margin.toFixed(1)+"% operating margin" : "Awaiting recorded income"}</b><span>Income less recorded expenses</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Total income</span><span className="metric-icon green"><ArrowDownRight size={18}/></span></div><strong className="metric-value">{money(totals.income,currency)}</strong><div className="metric-foot muted"><span>{periodTransactions.filter(t=>t.kind==="income"&&t.status==="recorded").length} recorded entries</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Total expenses</span><span className="metric-icon orange"><ShoppingCart size={18}/></span></div><strong className="metric-value">{money(totals.expenses,currency)}</strong><div className="metric-foot muted"><span>{periodTransactions.filter(t=>t.kind==="expense"&&t.status==="recorded").length} recorded entries</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Pending amount</span><span className="metric-icon purple"><FileText size={18}/></span></div><strong className="metric-value">{money(totals.pending,currency)}</strong><div className="metric-foot muted"><span>{periodTransactions.filter(t=>t.status==="pending").length} items awaiting review</span></div></article>
            </div>
            <div className="dashboard-grid"><article className="panel chart-panel" id="performance"><div className="panel-heading"><div><h2>Income &amp; expenses trend</h2><p>{period === "30" ? "Weekly totals across the last 30 days" : "Monthly totals calculated from recorded transactions"}</p></div><span className="live-chart-badge">FROM YOUR DATA</span></div><div className="chart-legend"><span><i className="legend-revenue"/>Income</span><span><i className="legend-expenses"/>Expenses</span></div><div className="chart-wrap">{trend.some(t=>t.revenue||t.expenses) ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top:12,right:5,left:-18,bottom:0}}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#19866a" stopOpacity={.18}/><stop offset="100%" stopColor="#19866a" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9eeeb"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#829089",fontSize:12}}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#829089",fontSize:11}} tickFormatter={v=>v>=1000000?(currency==="NGN"?"₦":"")+ (v/1000000).toFixed(1)+"m":(currency==="NGN"?"₦":"")+(v/1000).toFixed(0)+"k"}/><Tooltip formatter={(v)=>money(Number(v),currency)} contentStyle={{borderRadius:12,border:"1px solid #e5ebe7",fontSize:12}}/><Area type="monotone" dataKey="revenue" name="Income" stroke="#19866a" strokeWidth={2.5} fill="url(#revenueFill)"/><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#e6a24a" strokeWidth={2.5} fill="transparent"/></AreaChart></ResponsiveContainer> : <div className="chart-empty">No recorded income or expenses in this period. Add transactions to build your trend.</div>}</div><div className="chart-caption">Cancelled entries are excluded. Pending entries are shown separately and do not affect net operating result.</div></article>
              <article className="panel finance-summary-panel"><div className="panel-heading"><div><h2>Profit &amp; loss summary</h2><p>Recorded activity for the selected period</p></div><span className="live-chart-badge">LIVE LEDGER</span></div>
                <div className="pnl-total"><span>Net result</span><strong className={totals.profit>=0?"pnl-positive":"pnl-negative"}>{money(totals.profit,currency)}</strong></div>
                <div className="pnl-row"><span><i className="pnl-dot income-dot"/>Income</span><strong>{money(totals.income,currency)}</strong></div>
                <div className="pnl-track"><span className="pnl-track-income" style={{width:(totals.income+totals.expenses)>0?(totals.income/(totals.income+totals.expenses)*100)+"%":"0%"}}/></div>
                <div className="pnl-row"><span><i className="pnl-dot expense-dot"/>Expenses</span><strong>{money(totals.expenses,currency)}</strong></div>
                <div className="pnl-track"><span className="pnl-track-expense" style={{width:(totals.income+totals.expenses)>0?(totals.expenses/(totals.income+totals.expenses)*100)+"%":"0%"}}/></div>
                <div className="pnl-foot"><span>Operating margin</span><strong>{totals.income ? totals.margin.toFixed(1)+"%" : "—"}</strong></div>
                <p className="pnl-disclaimer">Calculated from recorded transactions only. Pending and cancelled entries are excluded.</p>
              </article></div>
            <div className="dashboard-grid dashboard-grid-lower">
              <article className="panel category-panel"><div className="panel-heading"><div><h2>Expense breakdown</h2><p>Top spending categories in this period</p></div><span className="live-chart-badge">BY CATEGORY</span></div>
                {expenseBreakdown.length ? <div className="category-list">{expenseBreakdown.map(item=><div className="category-item" key={item.category}><div className="category-item-heading"><span>{item.category}</span><strong>{money(item.amount,currency)}</strong></div><div className="category-track"><span style={{width:largestExpenseCategory>0?(item.amount/largestExpenseCategory*100)+"%":"0%"}}/></div></div>)}</div> : <div className="category-empty">No recorded expenses in this period. Expense categories will appear here when transactions are added.</div>}
                <div className="category-foot">Based on recorded expenses in the selected reporting period.</div>
              </article>
              <article className="panel health-panel"><div className="panel-heading"><div><h2>Performance signals</h2><p>Quick observations from your ledger</p></div><span className="live-chart-badge">CALCULATED</span></div><div className="signal-list">
                <div className="signal-row"><span className={totals.profit>=0?"signal-icon good":"signal-icon warn"}><Activity size={17}/></span><div><strong>{totals.income===0?"Income data needed":totals.profit>=0?"Positive operating result":"Expenses exceed income"}</strong><small>{totals.income===0?"Record income to calculate operating performance":totals.profit>=0?"Recorded income is above recorded expenses":"Review costs and revenue for this period"}</small></div></div>
                <div className="signal-row"><span className="signal-icon info"><Wallet size={17}/></span><div><strong>{totals.income ? totals.margin.toFixed(1)+"% operating margin":"Margin unavailable"}</strong><small>{totals.income ? (totals.margin>=20?"At least 20% of recorded income remains after recorded expenses":totals.margin>=0?"Keep monitoring costs relative to income":"Negative margin for selected period") : "Requires recorded income"}</small></div></div>
                <div className="signal-row"><span className={totals.pending>0?"signal-icon warn":"signal-icon good"}><FileText size={17}/></span><div><strong>{totals.pending>0?"Pending items need review":"No pending items in period"}</strong><small>{totals.pending>0?money(totals.pending,currency)+" awaiting confirmation":"All visible period entries are marked recorded or cancelled"}</small></div></div>
              </div><div className="health-disclaimer">Signals are simple calculations from your recorded data, not forecasts or professional financial advice.</div></article>
            </div>
            <section className="powerbi-report section-anchor" id="analytics">
              <div className="powerbi-report-heading">
                <div><span className="powerbi-eyebrow">BUSINESS INTELLIGENCE REPORT</span><h2>Analytics overview</h2><p>Explore how income, spending and operating results move across the selected period.</p></div>
                <span className="powerbi-source-badge"><i/> Live workspace data</span>
              </div>
              <div className="powerbi-visual-grid">
                <article className="panel powerbi-visual powerbi-trend-visual">
                  <div className="panel-heading"><div><h2>Operating performance</h2><p>Income, expenses and net result by reporting interval</p></div><span className="powerbi-visual-tag">TREND</span></div>
                  {trend.some(item=>item.revenue||item.expenses) ? <div className="powerbi-bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend.map(item=>({...item,net:item.revenue-item.expenses}))} margin={{top:12,right:8,left:-12,bottom:0}} barGap={5}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9eeeb"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#829089",fontSize:10}}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#829089",fontSize:9}} tickFormatter={v=>v>=1000000?(currency==="NGN"?"₦":"")+(v/1000000).toFixed(1)+"m":(currency==="NGN"?"₦":"")+(v/1000).toFixed(0)+"k"}/><Tooltip formatter={(value,name)=>[money(Number(value),currency),String(name)]} contentStyle={{borderRadius:10,border:"1px solid #e5ebe7",fontSize:10}}/><Bar dataKey="revenue" name="Income" fill="#16866a" radius={[4,4,0,0]} maxBarSize={25}/><Bar dataKey="expenses" name="Expenses" fill="#e7a44d" radius={[4,4,0,0]} maxBarSize={25}/><Bar dataKey="net" name="Net result" fill="#7296d4" radius={[4,4,0,0]} maxBarSize={25}/></BarChart></ResponsiveContainer></div> : <div className="powerbi-empty">Add recorded transactions to generate an operating performance report.</div>}
                  <div className="powerbi-legend"><span><i className="pbi-income"/>Income</span><span><i className="pbi-expense"/>Expenses</span><span><i className="pbi-net"/>Net result</span></div>
                </article>
                <article className="panel powerbi-visual powerbi-category-visual">
                  <div className="panel-heading"><div><h2>Expense composition</h2><p>How recorded spending is distributed</p></div><span className="powerbi-visual-tag">SHARE</span></div>
                  {expenseBreakdown.length ? <><div className="powerbi-donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius="57%" outerRadius="83%" paddingAngle={2} stroke="none">{expenseBreakdown.map((item,index)=><Cell key={item.category} fill={["#16866a","#e7a44d","#7296d4","#a78bca","#d27b70","#8ca99a"][index%6]}/>)}</Pie><Tooltip formatter={value=>money(Number(value),currency)} contentStyle={{borderRadius:10,border:"1px solid #e5ebe7",fontSize:10}}/></PieChart></ResponsiveContainer><div className="powerbi-donut-total"><strong>{money(totals.expenses,currency)}</strong><span>Recorded expenses</span></div></div><div className="powerbi-category-legend">{expenseBreakdown.map((item,index)=><div key={item.category}><span><i style={{background:["#16866a","#e7a44d","#7296d4","#a78bca","#d27b70","#8ca99a"][index%6]}}/>{item.category}</span><strong>{totals.expenses>0?(item.amount/totals.expenses*100).toFixed(1):"0.0"}%</strong></div>)}</div></> : <div className="powerbi-empty">Expense composition will appear when recorded expenses are added.</div>}
                </article>
              </div>
              <div className="powerbi-report-foot"><span>Reporting window: {period==="30"?"Last 30 days":period==="90"?"Last 90 days":"Last 6 months"}</span><span>Source: authorised workspace transactions · Cancelled and pending entries excluded from charts</span></div>
            </section>
            <div id="transactions" className="section-anchor"/><article className="panel transactions-panel" id="reports"><div className="panel-heading"><div><h2>Transaction ledger</h2><p>Search and export the records available to your workspace</p></div><button className="subtle-btn" onClick={exportCsv}><Download size={14}/> Export CSV</button></div><div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>STATUS</th><th className="align-right">AMOUNT</th></tr></thead><tbody>{filtered.slice(0,100).map(t=><tr key={t.id}><td><div className="transaction-name"><span className={t.kind==="income"?"transaction-icon income":"transaction-icon expense"}>{t.kind==="income"?<ArrowDownRight size={16}/>:<ArrowUpRight size={16}/>}</span><strong>{t.description}</strong></div></td><td>{t.category||"Uncategorized"}</td><td>{new Date(t.transaction_date+"T00:00:00").toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</td><td><span className={"status-badge "+(t.status==="recorded"?"recorded":"pending")}>{t.status}</span></td><td className={"align-right amount "+(t.kind==="income"?"amount-in":"")}>{t.kind==="income"?"+":"−"}{money(Number(t.amount),t.currency)}</td></tr>)}</tbody></table>{filtered.length===0&&<div className="empty-state">{query?"No transactions match your search.":"No transactions yet. Add your first record to begin analysis."}</div>}</div><div className="table-footer">Showing {Math.min(filtered.length,100)} of {filtered.length} matching records <span>Workspace-scoped data</span></div></article>
          </>}
        </>}
        <nav className="pbi-page-tabs" aria-label="Report pages"><a className="pbi-page-tab-active" href="#overview"><LayoutDashboard size={14}/> Executive overview</a><a className="pbi-page-tab" href="#performance"><Activity size={14}/> Performance</a><a className="pbi-page-tab" href="#transactions"><Wallet size={14}/> Financial detail</a><span className="pbi-page-tabs-spacer"/><span className="pbi-page-count">Choose a report page</span></nav>
        <footer className="footer"><span>BusinessIQ · Business intelligence workspace</span><span>Metrics are calculated from authorised workspace records</span>{["admin","super_admin"].includes(platformRole) && <Link href="/admin">Admin centre</Link>}<Link href="/help">Help &amp; support</Link></footer>
      </div>
    </section>
    {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}><section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="add-transaction-title"><div className="modal-heading"><div><h2 id="add-transaction-title">Add transaction</h2><p>Record a real entry in {organization?.name || "your workspace"}.</p></div><button className="icon-btn" onClick={()=>setShowAdd(false)} aria-label="Close"><X size={19}/></button></div><form onSubmit={addTransaction}><label>Description<input required maxLength={240} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. Customer payment"/></label><div className="form-two"><label>Type<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as "income"|"expense"})}><option value="income">Income</option><option value="expense">Expense</option></select></label><label>Amount ({currency})<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></label></div><div className="form-two"><label>Date<input required type="date" value={form.transaction_date} onChange={e=>setForm({...form,transaction_date:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as "recorded"|"pending"})}><option value="recorded">Recorded</option><option value="pending">Pending</option></select></label></div><label>Category<input maxLength={120} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="e.g. Sales, Logistics, Rent"/></label><div className="modal-note"><ShieldCheck size={15}/> Saved securely to this workspace. Your dashboard totals and trend will update after saving.</div><div className="modal-actions"><button type="button" className="subtle-btn" onClick={()=>setShowAdd(false)}>Cancel</button><button className="primary-btn" type="submit" disabled={saving}>{saving?<><LoaderCircle className="spin" size={15}/> Saving…</>:<><Plus size={15}/> Save transaction</>}</button></div></form></section></div>}
  </main>;
}
