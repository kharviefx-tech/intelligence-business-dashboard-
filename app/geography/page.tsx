"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Globe2, MapPin, Plus, RefreshCw, Search, Building2, X } from "lucide-react";

type Workspace = { id: string; name: string };
type Location = { id:string; location_name:string; location_type:string; country:string; country_code:string|null; region:string|null; city:string|null; address_line:string|null; notes:string|null };
type Analytics = { locations:Location[]; summary:{total_locations:number;countries:number;regions:number;cities:number}; by_country:{country:string;location_count:number}[]; by_region:{region:string;country:string;location_count:number}[]; by_city:{city:string;region:string|null;country:string;location_count:number}[]; data_quality:{source:string;inferred_location_data:boolean;generated_at:string} };
const emptyForm={location_name:"",location_type:"office",country:"",country_code:"",region:"",city:"",address_line:"",notes:""};
const types=["headquarters","office","store","warehouse","factory","branch","other"];

export default function GeographicAnalyticsPage(){
 const [workspaces,setWorkspaces]=useState<Workspace[]>([]);
 const [workspaceId,setWorkspaceId]=useState("");
 const [data,setData]=useState<Analytics|null>(null);
 const [form,setForm]=useState(emptyForm);
 const [showForm,setShowForm]=useState(false);
 const [query,setQuery]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const load=useCallback(async(id?:string)=>{
  setLoading(true);setError("");
  try{
   const dash=await fetch("/api/dashboard",{cache:"no-store"});const d=await dash.json();
   if(dash.status===401){window.location.href="/login?next=/geography";return;}
   if(!dash.ok)throw new Error(d.error||"Unable to load workspace.");
   const ws=(d.workspaces||[]) as Workspace[];setWorkspaces(ws);
   const selected=id&&ws.some(w=>w.id===id)?id:(ws.some(w=>w.id===d.profile?.preferred_organization_id)?d.profile.preferred_organization_id:ws[0]?.id)||"";
   setWorkspaceId(selected);
   if(!selected){setData(null);return;}
   const response=await fetch("/api/geography?organization_id="+encodeURIComponent(selected),{cache:"no-store"});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to load geographic data.");
   setData(result);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load geographic analytics.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/geography",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,organization_id:workspaceId})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not save location.");
   setForm(emptyForm);setShowForm(false);setNotice("Business location saved. Geographic summaries have been refreshed.");await load(workspaceId);
  }catch(e){setError(e instanceof Error?e.message:"Could not save location.");}
  finally{setSaving(false);}
 }
 const visible=(data?.locations||[]).filter(l=>([l.location_name,l.country,l.region,l.city,l.location_type].filter(Boolean).join(" ")).toLowerCase().includes(query.toLowerCase()));
 return <main style={{minHeight:"100vh",background:"#f5f7fa",color:"#172536",fontFamily:"Arial,sans-serif"}}>
  <header style={{height:68,background:"#fff",borderBottom:"1px solid #e5eaf0",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 clamp(16px,4vw,48px)"}}>
   <Link href="/" style={{display:"flex",alignItems:"center",gap:9,color:"#435368",fontSize:13}}><ArrowLeft size={17}/> Back to dashboard</Link>
   <div style={{display:"flex",alignItems:"center",gap:8,fontWeight:800,color:"#183b61"}}><Globe2 size={20}/> BusinessIQ Geographic Intelligence</div>
  </header>
  <section style={{maxWidth:1200,margin:"0 auto",padding:"34px 22px 60px"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:18,flexWrap:"wrap",marginBottom:24}}>
    <div><div style={{fontSize:10,fontWeight:800,letterSpacing:1.4,color:"#2876b9"}}>ANALYTICS &amp; INSIGHTS / GEOGRAPHY</div><h1 style={{fontSize:30,letterSpacing:-.8,margin:"10px 0 7px"}}>Geographical analytics</h1><p style={{margin:0,color:"#6d7b8b",fontSize:13}}>Understand your business footprint by country, region and city.</p></div>
    <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
     <select aria-label="Select workspace" value={workspaceId} onChange={e=>void load(e.target.value)} style={{padding:"11px 13px",border:"1px solid #dce4ec",borderRadius:8,background:"#fff",minWidth:150}}>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
     <button onClick={()=>void load(workspaceId)} style={btn}><RefreshCw size={15}/> Refresh</button>
     <button onClick={()=>setShowForm(v=>!v)} style={{...btn,background:"#1769aa",color:"#fff",borderColor:"#1769aa"}}><Plus size={16}/> Add location</button>
    </div>
   </div>
   {error&&<div style={alert}>{error}</div>}{notice&&<div style={{...alert,background:"#edf8f1",color:"#216c42",borderColor:"#cfe9d8"}}>{notice}</div>}
   {!workspaces.length&&!loading?<div style={empty}>Create a workspace before adding geographic business locations.</div>:null}
   {showForm&&<form onSubmit={save} style={{...card,marginBottom:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><strong>Add a business location</strong><button type="button" onClick={()=>setShowForm(false)} style={iconBtn} aria-label="Close"><X size={17}/></button></div>
    <div style={grid}>
     <Field label="Location name *"><input required minLength={2} maxLength={160} value={form.location_name} onChange={e=>setForm({...form,location_name:e.target.value})} placeholder="e.g. Lagos headquarters"/></Field>
     <Field label="Location type"><select value={form.location_type} onChange={e=>setForm({...form,location_type:e.target.value})}>{types.map(t=><option key={t} value={t}>{t.replaceAll("_"," ")}</option>)}</select></Field>
     <Field label="Country *"><input required minLength={2} maxLength={100} value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="e.g. Nigeria"/></Field>
     <Field label="Country code"><input maxLength={2} value={form.country_code} onChange={e=>setForm({...form,country_code:e.target.value.toUpperCase()})} placeholder="NG"/></Field>
     <Field label="State / province / region"><input maxLength={120} value={form.region} onChange={e=>setForm({...form,region:e.target.value})} placeholder="e.g. Lagos State"/></Field>
     <Field label="City"><input maxLength={120} value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="e.g. Ikeja"/></Field>
     <Field label="Street address"><input maxLength={240} value={form.address_line} onChange={e=>setForm({...form,address_line:e.target.value})} placeholder="Optional"/></Field>
     <Field label="Notes"><input maxLength={1000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional context"/></Field>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><button disabled={saving||!workspaceId} style={{...btn,background:"#1769aa",color:"#fff",borderColor:"#1769aa",opacity:saving?.65:1}}>{saving?"Saving…":"Save location"}</button></div>
   </form>}
   <div style={metrics}>
    <Metric label="Recorded locations" value={data?.summary.total_locations??0} icon={<MapPin size={18}/>}/>
    <Metric label="Countries" value={data?.summary.countries??0} icon={<Globe2 size={18}/>}/>
    <Metric label="Regions / states" value={data?.summary.regions??0} icon={<Building2 size={18}/>}/>
    <Metric label="Cities" value={data?.summary.cities??0} icon={<MapPin size={18}/>}/>
   </div>
   <div style={gridWide}>
    <section style={card}><h2 style={h2}>Business footprint by country</h2><p style={muted}>Count of locations explicitly recorded in this workspace.</p>
     {loading?<div style={empty}>Loading geographic records…</div>:!data?.by_country.length?<div style={empty}>No geographic records yet. Add your first business location to begin building this view.</div>:data.by_country.map((r,i)=><div key={r.country} style={barRow}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:7}}><strong>{r.country}</strong><span>{r.location_count} {r.location_count===1?"location":"locations"}</span></div><div style={track}><div style={{...fill,width:((r.location_count/Math.max(...data.by_country.map(x=>x.location_count)))*100)+"%"}}/></div></div>)}
    </section>
    <section style={card}><h2 style={h2}>Regional coverage</h2><p style={muted}>States, provinces and regions supplied by your team.</p>
     {!data?.by_region.length?<div style={empty}>Regional coverage will appear when locations include a state, province or region.</div>:data.by_region.slice(0,8).map(r=><div key={r.country+r.region} style={listRow}><span><strong>{r.region}</strong><small>{r.country}</small></span><b>{r.location_count}</b></div>)}
    </section>
   </div>
   <section style={{...card,marginTop:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h2 style={h2}>Location directory</h2><p style={muted}>Search and review the locations recorded for this workspace.</p></div><label style={search}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search locations"/></label></div>
    {visible.length===0?<div style={empty}>{loading?"Loading…":"No matching locations found."}</div>:<div style={{overflowX:"auto",marginTop:12}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left",fontSize:12}}><thead><tr>{["Location","Type","Country","Region / state","City"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{visible.map(l=><tr key={l.id}>{[l.location_name,l.location_type.replaceAll("_"," "),l.country,l.region||"—",l.city||"—"].map((v,i)=><td key={i} style={td}>{v}</td>)}</tr>)}</tbody></table></div>}
   </section>
   <p style={{fontSize:10,color:"#8794a3",lineHeight:1.6,marginTop:16}}>Data source: {data?.data_quality.source||"workspace location records"}. Location information is entered by workspace members; BusinessIQ does not infer locations from IP addresses or financial transactions. This page reports recorded business footprint, not customer demand or revenue by region.</p>
  </section>
 </main>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label style={{display:"grid",gap:7,fontSize:11,fontWeight:700,color:"#536579"}}>{label}{children}</label>}
function Metric({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div style={card}><div style={{display:"flex",justifyContent:"space-between",color:"#64758a",fontSize:11}}>{label}<span style={{color:"#2779b8"}}>{icon}</span></div><strong style={{display:"block",fontSize:27,marginTop:13,color:"#183b61"}}>{value.toLocaleString()}</strong></div>}
const btn:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:7,padding:"10px 13px",border:"1px solid #dce4ec",borderRadius:8,background:"#fff",color:"#40556b",fontWeight:700,fontSize:11,cursor:"pointer"};
const card:React.CSSProperties={background:"#fff",border:"1px solid #e3e9ef",borderRadius:12,padding:18};
const grid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:13};
const gridWide:React.CSSProperties={display:"grid",gridTemplateColumns:"minmax(0,1.4fr) minmax(260px,1fr)",gap:16,marginTop:18};
const metrics:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:13};
const h2:React.CSSProperties={fontSize:14,margin:"0 0 6px",color:"#203c59"};
const muted:React.CSSProperties={fontSize:11,color:"#8290a0",margin:"0 0 18px"};
const empty:React.CSSProperties={padding:"25px 12px",textAlign:"center",fontSize:12,color:"#8a97a6",lineHeight:1.6};
const alert:React.CSSProperties={padding:12,border:"1px solid #f0d1d1",background:"#fff3f3",color:"#a43f3f",borderRadius:8,fontSize:12,marginBottom:14};
const iconBtn:React.CSSProperties={border:0,background:"transparent",cursor:"pointer",color:"#65758a"};
const barRow:React.CSSProperties={marginBottom:16};
const track:React.CSSProperties={height:8,background:"#edf2f6",borderRadius:10,overflow:"hidden"};
const fill:React.CSSProperties={height:"100%",background:"#3286bd",borderRadius:10,display:"block"};
const listRow:React.CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #eef2f5",fontSize:12};
const search:React.CSSProperties={display:"flex",alignItems:"center",gap:8,padding:"9px 11px",border:"1px solid #e0e7ee",borderRadius:8,color:"#8090a0"};
const th:React.CSSProperties={padding:"11px 9px",borderBottom:"1px solid #e8edf2",fontSize:10,color:"#8592a0",whiteSpace:"nowrap"};
const td:React.CSSProperties={padding:"12px 9px",borderBottom:"1px solid #f0f3f6",color:"#40556b",whiteSpace:"nowrap"};
