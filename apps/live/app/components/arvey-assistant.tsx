"use client";

import { FormEvent, useState } from "react";
import "./arvey-assistant.css";

type Props = { currentSong: { title: string; artist: string; year: number | null } };
type Message = { role: "user" | "assistant"; content: string };

export function ArveyAssistant({ currentSong }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next); setInput(""); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/arvey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next, currentSong }) });
      const data = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !data.answer) throw new Error(data.error || "Arvey is unavailable.");
      setMessages([...next, { role: "assistant", content: data.answer }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Arvey couldn’t answer just now. Please try again in a moment."); }
    finally { setLoading(false); }
  }

  return <>
    <button className="arvey-trigger" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">Ask Arvey</button>
    {open ? <div className="arvey-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="arvey-panel" role="dialog" aria-modal="true" aria-labelledby="arvey-title">
        <div className="arvey-heading"><div><p className="arvey-kicker">A guide for the live page</p><h2 id="arvey-title">Ask Arvey</h2></div><button className="arvey-close" type="button" onClick={() => setOpen(false)} aria-label="Close Arvey">×</button></div>
        <div className="arvey-messages" aria-live="polite">{!messages.length ? <p className="arvey-welcome">Hi, I’m Arvey. What would you like to know?</p> : messages.map((message, index) => <div className={`arvey-message arvey-message--${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}{loading ? <div className="arvey-message arvey-message--assistant arvey-loading">Arvey is thinking…</div> : null}</div>
        {error ? <p className="arvey-error" role="alert">{error}</p> : null}
        <form className="arvey-form" onSubmit={submit}><label className="sr-only" htmlFor="arvey-question">Your question</label><input id="arvey-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask anything…" autoComplete="off" disabled={loading} /><button type="submit" disabled={loading || !input.trim()}>Send</button></form>
      </section>
    </div> : null}
  </>;
}
