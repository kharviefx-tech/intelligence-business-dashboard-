"use client";

import "./import.css";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSpreadsheet, LoaderCircle, ShieldCheck, UploadCloud, XCircle } from "lucide-react";

type ImportRow = { transaction_date: string; description: string; kind: "income" | "expense"; amount: number; currency: string; category: string; status: "recorded" | "pending" };
type Workspace = { id: string; name: string; currency: string };
const supportedCurrencies = new Set(["NGN","USD","GBP","EUR","GHS","KES","ZAR"]);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

function dateValue(value: string): string {
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export default function ImportPage() {
  const [workspace, setWorkspace] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadWorkspaces() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load workspaces.");
      const available = data.workspaces || [];
      setWorkspaces(available);
      const preferred = data.profile?.preferred_organization_id;
      const selected = available.some((item: Workspace) => item.id === preferred) ? preferred : available[0]?.id || "";
      setWorkspace(selected);
      if (!selected) setError("Create a workspace before importing business records.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load workspaces."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadWorkspaces(); }, []);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(""); setMessage(""); setRows([]);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Please choose a CSV file. You can export Excel sheets as CSV."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("The CSV file must be 5 MB or smaller."); return; }
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error("The file needs a header row and at least one transaction.");
      const headers = parsed[0].map(h => h.toLowerCase().replace(/[ _-]+/g, "").trim());
      const index = (names: string[]) => headers.findIndex(h => names.includes(h));
      const dateI = index(["date", "transactiondate"]), descI = index(["description", "details", "memo"]), typeI = index(["type", "kind"]), amountI = index(["amount", "value"]), categoryI = index(["category"]), currencyI = index(["currency"]), statusI = index(["status"]);
      if ([dateI, descI, typeI, amountI].some(i => i < 0)) throw new Error("Required columns: Date, Description, Type and Amount. Category, Currency and Status are optional.");
      const imported = parsed.slice(1).map((cells, i) => {
        const kindRaw = (cells[typeI] || "").toLowerCase();
        const kind = ["income", "revenue", "credit", "sale"].includes(kindRaw) ? "income" : ["expense", "debit", "cost", "spend"].includes(kindRaw) ? "expense" : "";
        const amount = Number((cells[amountI] || "").replace(/[₦$£€,\s]/g, ""));
        const date = dateValue(cells[dateI] || "");
        const description = (cells[descI] || "").trim();
        const currency = ((cells[currencyI] || "").trim().toUpperCase() || "NGN");
        if (!kind || !Number.isFinite(amount) || amount <= 0 || !date || !description) throw new Error("Invalid data on CSV row " + (i + 2) + ". Check its date, description, type and positive amount.");
        if (!supportedCurrencies.has(currency)) throw new Error("Unsupported currency on CSV row " + (i + 2) + ". Use NGN, USD, GBP, EUR, GHS, KES or ZAR.");
        if (description.length > 240) throw new Error("Description on CSV row " + (i + 2) + " is longer than 240 characters.");
        return { transaction_date: date, description, kind: kind as "income" | "expense", amount, currency, category: (cells[categoryI] || "Uncategorized").trim(), status: (cells[statusI] || "").toLowerCase() === "pending" ? "pending" as const : "recorded" as const };
      });
      if (imported.length > 500) throw new Error("Import up to 500 rows per batch.");
      setRows(imported); setFileName(file.name);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read this CSV file."); }
    event.target.value = "";
  }

  async function importRows() {
    if (!workspace || !rows.length) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/import/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: workspace, rows }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed.");
      setMessage(data.imported + " transactions imported successfully. Your BusinessIQ analytics will update from these records.");
      setRows([]); setFileName("");
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed."); }
    finally { setSaving(false); }
  }

  const preview = useMemo(() => rows.slice(0, 8), [rows]);
  const totals = useMemo(() => rows.reduce((sum, row) => { if (row.kind === "income") sum.income += row.amount; else sum.expense += row.amount; return sum; }, { income: 0, expense: 0 }), [rows]);
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white px-5 py-4"><div className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/" className="flex items-center gap-3 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white">B</span>BusinessIQ</Link><Link href="/" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"><ArrowLeft size={16}/> Dashboard</Link></div></header>
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8"><div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[.18em] text-emerald-700"><FileSpreadsheet size={16}/> BUSINESSIQ DATA</div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Import your business data</h1><p className="mt-3 max-w-2xl text-slate-600">Bring records directly into BusinessIQ. No Microsoft account, Power BI licence or external spreadsheet connection is required.</p></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">1. Choose a workspace</h2>
          <div className="mt-3 flex flex-wrap gap-3"><select aria-label="Workspace" value={workspace} onChange={e=>setWorkspace(e.target.value)} disabled={loading||!workspaces.length} className="min-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:opacity-60"><option value="">{loading?"Loading workspaces…":"Select workspace"}</option>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><button onClick={()=>void loadWorkspaces()} disabled={loading} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">{loading?"Loading…":"Refresh workspaces"}</button></div>
          <div className="mt-8"><h2 className="text-lg font-semibold">2. Upload a CSV file</h2><label className={"mt-3 flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center "+(workspace?"cursor-pointer border-slate-300 bg-slate-50 hover:border-emerald-500":"cursor-not-allowed border-slate-200 bg-slate-100 opacity-60")}><UploadCloud size={30} className="mb-3 text-emerald-700"/><strong>{workspace?"Choose a CSV file":"Select a workspace first"}</strong><span className="mt-1 text-sm text-slate-500">Maximum 5 MB · Up to 500 transactions</span><input type="file" accept=".csv,text/csv" disabled={!workspace||loading} className="sr-only" onChange={onFile}/></label></div>
          {fileName&&<p className="mt-3 text-sm text-slate-600">Selected: <strong>{fileName}</strong></p>}
          {error&&<div role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><XCircle size={17}/>{error}</div>}
          {message&&<div role="status" className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17}/>{message}</div>}
          {!!rows.length&&<div className="mt-7"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">3. Review import</h3><span className="text-sm text-slate-500">{rows.length} validated rows ready</span></div><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">Currency</th></tr></thead><tbody>{preview.map((r,i)=><tr key={i} className="border-t border-slate-100"><td className="p-3">{r.transaction_date}</td><td className="p-3">{r.description}</td><td className="p-3 capitalize">{r.kind}</td><td className="p-3">{r.amount.toLocaleString()}</td><td className="p-3">{r.currency}</td></tr>)}</tbody></table></div>{rows.length>8&&<p className="mt-2 text-xs text-slate-500">Showing first 8 rows. All {rows.length} validated rows will be imported.</p>}<div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3"><div><span className="block text-xs text-slate-500">Income in file</span><strong>{totals.income.toLocaleString("en-NG")}</strong></div><div><span className="block text-xs text-slate-500">Expenses in file</span><strong>{totals.expense.toLocaleString("en-NG")}</strong></div><div><span className="block text-xs text-slate-500">Net movement</span><strong>{(totals.income-totals.expense).toLocaleString("en-NG")}</strong></div></div><div className="mt-5 flex flex-wrap gap-3"><button onClick={()=>void importRows()} disabled={saving||!workspace} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?<LoaderCircle size={16} className="animate-spin"/>:<ShieldCheck size={16}/>} {saving?"Importing…":"Import "+rows.length+" transactions"}</button><button onClick={()=>{setRows([]);setFileName("");}} className="rounded-lg border border-slate-300 px-4 py-3 text-sm">Cancel</button></div><p className="mt-3 text-xs text-slate-500">Imports are saved as new records. Check your file for duplicates before importing.</p></div>}
        </section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">CSV format</h2><p className="mt-2 text-sm text-slate-600">Your first row must contain column headings. Required:</p><div className="mt-3 rounded-lg bg-slate-50 p-3 font-mono text-xs leading-6">Date, Description, Type, Amount</div><p className="mt-3 text-sm text-slate-600">Optional columns:</p><div className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-xs leading-6">Category, Currency, Status</div><p className="mt-3 text-sm text-slate-600">Type accepts income or expense. Currency defaults to NGN; status defaults to recorded.</p><a href="data:text/csv;charset=utf-8,Date%2CDescription%2CType%2CAmount%2CCategory%2CCurrency%2CStatus%0A2026-10-01%2CCustomer%20payment%2Cincome%2C150000%2CSales%2CNGN%2Crecorded%0A2026-10-02%2COffice%20rent%2Cexpense%2C50000%2CRent%2CNGN%2Crecorded" download="businessiq-import-template.csv" className="mt-5 inline-flex text-sm font-semibold text-emerald-700 underline">Download CSV template</a><div className="mt-6 flex gap-2 rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"><ShieldCheck size={16} className="shrink-0"/> Workspace access is checked on the server. Each batch is saved atomically.</div></aside>
      </div>
    </section>
  </main>;
}
