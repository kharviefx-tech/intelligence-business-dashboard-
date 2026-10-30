"use client";

import { FormEvent, useState } from "react";
import { Bot, ChevronDown, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import "./businessiq-assistant.css";

type Message = { role: "assistant" | "user"; text: string; recommendations?: string[]; disclaimer?: string };
const prompts = ["How is my business performing?", "Where are my biggest expenses?", "What should I review first?"];

export default function BusinessIQAssistant({ organizationId, period = "30" }: { organizationId: string; period?: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hello! I’m your BusinessIQ Assistant. I can analyse the transactions in your selected workspace, explain performance and highlight items worth reviewing. What would you like to understand?" }
  ]);

  async function ask(text: string) {
    const prompt = text.trim();
    if (!prompt || busy || !organizationId) return;
    setMessages(current => [...current, { role: "user", text: prompt }]);
    setQuestion("");
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId, question: prompt, period: Number(period) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to analyse your workspace.");
      setMessages(current => [...current, { role: "assistant", text: data.answer, recommendations: data.recommendations, disclaimer: data.disclaimer }]);
    } catch (error) {
      setMessages(current => [...current, { role: "assistant", text: error instanceof Error ? error.message : "Something went wrong. Please try again." }]);
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void ask(question); }

  return <div className="bi-assistant-root">
    {open && <section className="bi-assistant-panel" aria-label="BusinessIQ Assistant">
      <header className="bi-assistant-header"><div className="bi-assistant-brand"><span><Bot size={19}/></span><div><strong>BusinessIQ Assistant</strong><small><i/> Workspace-aware insights</small></div></div><button onClick={() => setOpen(false)} aria-label="Close assistant"><X size={18}/></button></header>
      <div className="bi-assistant-context"><Sparkles size={14}/> Analysing your selected workspace · {period === "90" ? "90 days" : period === "180" ? "6 months" : "30 days"}</div>
      <div className="bi-assistant-messages" aria-live="polite">
        {messages.map((message,index)=><div className={"bi-assistant-message "+message.role} key={index}><div className="bi-assistant-bubble">{message.text}</div>{message.recommendations?.length ? <div className="bi-assistant-recommendations"><strong>Suggested next steps</strong>{message.recommendations.map((item,i)=><div key={i}><span>{i+1}</span>{item}</div>)}</div> : null}{message.disclaimer && <small className="bi-assistant-disclaimer">{message.disclaimer}</small>}</div>)}
        {busy && <div className="bi-assistant-typing"><LoaderCircle size={15}/> Checking workspace records…</div>}
      </div>
      {messages.length === 1 && <div className="bi-assistant-prompts">{prompts.map(prompt=><button key={prompt} onClick={()=>void ask(prompt)}>{prompt}</button>)}</div>}
      <form className="bi-assistant-form" onSubmit={submit}><input value={question} onChange={event=>setQuestion(event.target.value)} placeholder="Ask about income, expenses, profit…" maxLength={600} aria-label="Ask BusinessIQ Assistant"/><button type="submit" disabled={busy || !question.trim() || !organizationId} aria-label="Send question">{busy?<LoaderCircle className="bi-spin" size={17}/>:<Send size={17}/>}</button></form>
      {!organizationId && <div className="bi-assistant-no-workspace">Create or select a workspace to start.</div>}
    </section>}
    <button className="bi-assistant-launcher" onClick={()=>setOpen(value=>!value)} aria-label={open?"Close BusinessIQ Assistant":"Open BusinessIQ Assistant"}>{open?<ChevronDown size={19}/>:<><MessageCircle size={19}/><span>Ask BusinessIQ</span></>}</button>
  </div>;
}
