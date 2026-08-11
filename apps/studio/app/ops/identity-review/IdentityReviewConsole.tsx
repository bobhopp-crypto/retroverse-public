"use client";

import { useEffect, useMemo, useState } from "react";
import type { IdentityReviewItem } from "@/lib/ops/identity-review-store";

export function IdentityReviewConsole({ initialQueue }: { initialQueue: IdentityReviewItem[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [candidateRvtr, setCandidateRvtr] = useState<string | null>(initialQueue[0]?.candidates[0]?.rvtr ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const item = queue[index] ?? null;
  const approved = useMemo(() => initialQueue.length - queue.length, [initialQueue.length, queue.length]);

  useEffect(() => { setCandidateRvtr(item?.candidates[0]?.rvtr ?? null); }, [item]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (busy || !item || event.target instanceof HTMLInputElement) return; if (event.key.toLowerCase() === "a") void decide("APPROVE"); if (event.key.toLowerCase() === "r") void decide("REJECT"); if (event.key.toLowerCase() === "s") void decide("SKIP"); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });
  async function decide(decision: "APPROVE" | "REJECT" | "SKIP") {
    if (!item || busy) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/ops/identity-review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoPath: item.videoPath, decision, candidateRvtr }) });
    const body = await response.json() as { error?: string; lifecycleState?: string };
    if (!response.ok) { setMessage(body.error ?? "Action failed"); setBusy(false); return; }
    if (decision !== "SKIP") setQueue((current) => current.filter((_, currentIndex) => currentIndex !== index)); else setIndex((current) => Math.min(current + 1, queue.length - 1));
    setMessage(decision === "APPROVE" ? `Approved · ${body.lifecycleState}` : decision === "REJECT" ? "Candidate rejected; item remains unresolved." : "Skipped; preserved for later review."); setBusy(false);
  }
  if (!item) return <main className="identity-review"><header className="identity-review__top"><div><p>Catalog Integrity · Human Review</p><h1>Identity Review</h1></div><span>Queue complete</span></header><section className="identity-review__empty"><h2>No pending candidates</h2><p>Approved and rejected items remain recorded in the review history.</p></section></main>;
  return <main className="identity-review"><header className="identity-review__top"><div><p>Catalog Integrity · Human Review</p><h1>Identity Review</h1></div><div className="identity-review__progress"><strong>{index + 1} of {queue.length}</strong><span>Approved: {approved}</span><span>Pending: {queue.length}</span></div></header><section className="identity-review__grid"><article className="identity-review__card"><p className="identity-review__eyebrow">VDJ VIDEO</p><h2>{item.vdjTitle ?? item.vdj.split(" — ")[1] ?? item.vdj}</h2><h3>{item.vdjArtist ?? item.vdj.split(" — ")[0]}</h3><dl><div><dt>Filename</dt><dd>{item.videoPath.split("/").pop()}</dd></div><div><dt>Path</dt><dd>{item.videoPath}</dd></div><div><dt>VDJ year</dt><dd>{item.vdjYear ?? "unknown"}</dd></div><div><dt>VDJ album</dt><dd>{item.vdjAlbum ?? "unknown"}</dd></div><div><dt>Playcount</dt><dd>{item.playCount ?? "unknown"}</dd></div><div><dt>Evidence</dt><dd>{item.evidence}</dd></div></dl></article><article className="identity-review__card identity-review__candidate"><p className="identity-review__eyebrow">PROPOSED CANONICAL MATCH</p>{item.candidates.map((candidate) => <label key={candidate.rvtr} className={candidate.rvtr === candidateRvtr ? "is-selected" : ""}><input type="radio" name="candidate" checked={candidate.rvtr === candidateRvtr} onChange={() => setCandidateRvtr(candidate.rvtr)} /><span><strong>{candidate.artist} — {candidate.title}</strong><small>{candidate.rvtr} · Year {candidate.year ?? "unknown"} · Album {candidate.album ?? "unknown"} · Chart Journey {candidate.source === "hot100" || candidate.source === "hot100_vdj" ? "yes" : "no"}</small></span></label>)}<p className="identity-review__question">{item.question}</p></article></section><section className="identity-review__actions" aria-label="Identity review actions"><button type="button" onClick={() => void decide("APPROVE")} disabled={busy || !candidateRvtr}>APPROVE <kbd>A</kbd></button><button type="button" onClick={() => void decide("REJECT")} disabled={busy || !candidateRvtr}>REJECT <kbd>R</kbd></button><button type="button" onClick={() => void decide("SKIP")} disabled={busy}>SKIP <kbd>S</kbd></button></section>{message ? <p className="identity-review__message" role="status">{message}</p> : null}</main>;
}
