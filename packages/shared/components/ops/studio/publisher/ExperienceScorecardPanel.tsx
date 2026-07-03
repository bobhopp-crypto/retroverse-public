"use client";

import { useState } from "react";

import type {
  ExperienceScorecard,
  ExperienceScorecardDimensionId,
} from "@/lib/ops/studio/publisher/experience/types";

type Props = {
  rvtr: string;
  scorecard: ExperienceScorecard;
  onSaved?: () => void;
};

export function ExperienceScorecardPanel({ rvtr, scorecard, onSaved }: Props) {
  const [scores, setScores] = useState<Partial<Record<ExperienceScorecardDimensionId, number>>>(() => {
    const initial: Partial<Record<ExperienceScorecardDimensionId, number>> = {};
    for (const dim of scorecard.dimensions) {
      initial[dim.id] = dim.operatorScore ?? dim.autoScore;
    }
    return initial;
  });
  const [note, setNote] = useState(scorecard.operatorNote ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/ops/studio/publisher/${rvtr}/scorecard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores, note }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "save_failed");
      setMessage("Scorecard saved");
      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rs-studio-review-panel rs-studio-review-panel--info rs-exp-scorecard">
      <header className="rs-exp-scorecard__head">
        <h2 className="rs-exp-scorecard__title">Experience Scorecard</h2>
        <p className="rs-exp-scorecard__emotion">{scorecard.emotionScore}% emotion</p>
      </header>
      <p className="rs-exp-scorecard__lead">
        Editorial judgment — not generated prose. Your scores become evidence for future packages.
      </p>

      <div className="rs-exp-scorecard__grid">
        {scorecard.dimensions.map((dim) => (
          <label key={dim.id} className="rs-exp-scorecard__row">
            <span className="rs-exp-scorecard__label">{dim.label}</span>
            <span className="rs-exp-scorecard__auto">auto {dim.autoScore}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={scores[dim.id] ?? dim.autoScore}
              onChange={(e) =>
                setScores((prev) => ({ ...prev, [dim.id]: Number(e.target.value) }))
              }
            />
            <strong>{scores[dim.id] ?? dim.autoScore}</strong>
          </label>
        ))}
      </div>

      <textarea
        className="rs-exp-scorecard__note"
        rows={2}
        placeholder="Editorial note — why this score?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button type="button" className="rs-exp-scorecard__save" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save editorial scorecard"}
      </button>
      {message ? <p className="rs-exp-scorecard__msg">{message}</p> : null}
    </section>
  );
}
