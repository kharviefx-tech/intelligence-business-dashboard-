"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Link2, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";

export default function MicrosoftConnect() {
  const [connected,setConnected]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{fetch("/api/auth/microsoft/status",{cache:"no-store"}).then(r=>r.json()).then(d=>setConnected(Boolean(d.connected))).catch(()=>setConnected(false)).finally(()=>setLoading(false));},[]);
  async function disconnect(){setBusy(true);try{await fetch("/api/auth/microsoft/status",{method:"DELETE"});setConnected(false);}finally{setBusy(false);}}
  return <div className="ms-connect-panel"><div className="ms-connect-copy"><div className="ms-connect-shield"><ShieldCheck size={20}/></div><div><strong>{connected?"Microsoft account connected":"Connect your Microsoft account"}</strong><p>{connected?"Your BusinessIQ session has an authorised Microsoft account.":"Securely authorise BusinessIQ to access the Microsoft services you approve."}</p></div></div>{loading?<span className="ms-connect-loading"><LoaderCircle className="spin" size={16}/> Checking…</span>:connected?<button className="ms-connect-button connected" onClick={disconnect} disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<LogOut size={15}/>} Disconnect</button>:<a className="ms-connect-button" href="/api/auth/microsoft/start"><Link2 size={15}/> Connect Microsoft</a>}</div>;
}
