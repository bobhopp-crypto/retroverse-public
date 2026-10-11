"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "./arvey-assistant.css";

type Song = { title: string; artist: string; year: number | null; videoKey?: string | null };
type Message = { role: "user"; content: string } | { role: "assistant"; content: Answer };
type Answer = {
  explanation: { title: string; text: string };
  timeline: Array<{ date: string; title: string; detail: string }>;
  facts: Array<{ label: string; value: string }>;
  media_card: { title: string; description: string };
  sources: Array<{ title: string; url: string }>;
};
function SafeAnswer({ answer }: { answer: Answer }) {
  return <div className="rv-chat-answer">
    {answer.explanation?.text ? <section className="rv-chat-explanation">{answer.explanation.title ? <h3>{answer.explanation.title}</h3> : null}<p>{answer.explanation.text}</p></section> : null}
    {answer.timeline?.length ? <section className="rv-chat-card"><h3>A short timeline</h3><ol className="rv-chat-timeline">{answer.timeline.map((item, index) => <li key={`${item.date}-${index}`}><time>{item.date}</time><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ol></section> : null}
    {answer.facts?.length ? <section className="rv-chat-card"><h3>Worth knowing</h3><dl>{answer.facts.map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></section> : null}
    {answer.media_card?.description ? <section className="rv-chat-media"><span aria-hidden="true">♫</span><div><h3>{answer.media_card.title || "A listening note"}</h3><p>{answer.media_card.description}</p></div></section> : null}
    {answer.sources?.length ? <details className="rv-chat-sources"><summary>Sources · {answer.sources.length}</summary><ul>{answer.sources.map((source, index) => { try { const url = new URL(source.url); return url.protocol === "https:" ? <li key={`${url.href}-${index}`}><a href={url.href} target="_blank" rel="noreferrer">{source.title} ↗</a></li> : null; } catch { return null; } })}</ul></details> : null}
  </div>;
}

export function ArveyAssistant({ currentSong }: { currentSong: Song }) {
  const pathname = usePathname() ?? "/";
  const [latestSong, setLatestSong] = useState(currentSong);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [failedQuestion, setFailedQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [artFailed, setArtFailed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onSongContext = (event: Event) => {
      const detail = (event as CustomEvent<Song>).detail;
      if (detail?.title && detail?.artist) setLatestSong({ ...detail });
    };
    const onOpen = (event: Event) => {
      if (selectedSong) return;
      const detail = (event as CustomEvent<{ currentSong?: Song }>).detail;
      setSelectedSong({ ...(detail?.currentSong?.title && detail.currentSong.artist ? detail.currentSong : latestSong) });
      setMessages([]);
      setError("");
    };
    window.addEventListener("retroverse:song-context", onSongContext);
    window.addEventListener("retroverse:open-arvey", onOpen);
    return () => { window.removeEventListener("retroverse:song-context", onSongContext); window.removeEventListener("retroverse:open-arvey", onOpen); };
  }, [latestSong, selectedSong]);

  useEffect(() => {
    if (!selectedSong) return;
    setArtFailed(false);
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy.current) close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSong]);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages, loading]);

  function close() {
    requestRef.current += 1;
    abortRef.current?.abort(); abortRef.current = null; busy.current = false;
    setSelectedSong(null); setMessages([]); setInput(""); setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy.current || !selectedSong) return;
    const next: Message[] = [...messages, { role: "user", content: question }];
    busy.current = true; const requestId = ++requestRef.current; abortRef.current = new AbortController(); setMessages(next); setInput(""); setError(""); setFailedQuestion(""); setLoading(true);
    try {
      const response = await fetch("/api/arvey", { method: "POST", signal: abortRef.current.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(-12).map((message) => ({ role: message.role, content: message.role === "assistant" ? JSON.stringify(message.content) : message.content })), currentSong: selectedSong }) });
      const data = await response.json() as { components?: Answer; error?: string };
      if (!response.ok || !data.components || !data.components.explanation || !Array.isArray(data.components.timeline) || !Array.isArray(data.components.facts)) throw new Error(data.error || "Retroverse couldn’t answer just now.");
      if (requestId === requestRef.current) setMessages([...next, { role: "assistant", content: data.components }]);
    } catch (caught) { if (requestId === requestRef.current) { setError(caught instanceof Error ? caught.message : "Retroverse couldn’t answer just now. Please try again."); setFailedQuestion(question); } }
    finally { if (requestId === requestRef.current) { busy.current = false; abortRef.current = null; setLoading(false); } }
  }

  if (pathname === "/jukebox") return null;

  return <>
    <button className="arvey-trigger" type="button" onClick={() => window.dispatchEvent(new Event("retroverse:open-arvey"))} aria-haspopup="dialog">CHAT ABOUT THIS</button>
    {selectedSong ? <div className="rv-chat-backdrop"><main className="rv-chat-window" role="dialog" aria-modal="true" aria-labelledby="rv-chat-title">
      <header className="rv-chat-top"><button type="button" onClick={close} aria-label="Return to Retroverse">← BACK TO LIVE</button><span>RETROVERSE · MUSIC GUIDE</span><button className="rv-chat-close" type="button" onClick={close} aria-label="Close chat">×</button></header>
      <section className="rv-chat-song" aria-label="Selected song">
        {selectedSong.videoKey && !artFailed ? <img src={`/api/vdjbx/still/${encodeURIComponent(selectedSong.videoKey)}`} alt="" onError={() => setArtFailed(true)} /> : <span className="rv-chat-note" aria-hidden="true">♫</span>}
        <div><p>CHAT ABOUT THIS SONG</p><h1 id="rv-chat-title">{selectedSong.title}</h1><span>{selectedSong.artist}{selectedSong.year ? ` · ${selectedSong.year}` : ""}</span></div>
      </section>
      <div className="rv-chat-thread" ref={listRef} aria-live="polite">
        {!messages.length ? <section className="rv-chat-welcome"><span>THE SONG IS YOUR CONTEXT</span><h2>What would you like to know?</h2><p>Ask about the recording, the people behind it, or the story around its release.</p><div>{["Who made this recording?", "What happened when it was released?", "Tell me a detail worth knowing."].map((prompt) => <button key={prompt} type="button" onClick={() => setInput(prompt)}>{prompt} <span>↗</span></button>)}</div></section> : messages.map((message, index) => <article className={`rv-chat-turn rv-chat-turn--${message.role}`} key={`${message.role}-${index}`}>
          {message.role === "user" ? <p className="rv-chat-user">{message.content}</p> : <SafeAnswer answer={message.content} />}
        </article>)}
        {loading ? <p className="rv-chat-thinking" role="status">Putting the story together…</p> : null}
      </div>
      {error ? <p className="rv-chat-error" role="alert">{error} {failedQuestion ? <button type="button" onClick={() => { setInput(failedQuestion); inputRef.current?.focus(); }}>Edit question</button> : null}</p> : null}
      <form className="rv-chat-compose" onSubmit={submit}><label className="sr-only" htmlFor="rv-chat-question">Ask about this song</label><input ref={inputRef} id="rv-chat-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about this song…" autoComplete="off" maxLength={1200} disabled={loading} /><button type="submit" disabled={loading || !input.trim()}>↑<span className="sr-only">Send</span></button><small>Answers may be incomplete. Check cited sources for details.</small></form>
    </main></div> : null}
  </>;
}
