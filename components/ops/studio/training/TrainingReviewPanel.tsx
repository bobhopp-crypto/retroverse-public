"use client";

import { useState } from "react";

import type {
  TrainingDepartmentId,
  TrainingDepartmentSnapshot,
  TrainingReviewVerdict,
} from "@/lib/ops/studio/training/types";

type Props = {
  rvtr: string;
  department: TrainingDepartmentId;
  snapshot: TrainingDepartmentSnapshot;
  onSaved?: () => void;
};

const VERDICTS: Array<{ id: TrainingReviewVerdict; label: string }> = [
  { id: "approve", label: "Approve" },
  { id: "needs_coaching", label: "Needs Coaching" },
  { id: "reject", label: "Reject" },
];

export function TrainingReviewPanel({ rvtr, department, snapshot, onSaved }: Props) {
  const [note, setNote] = useState(snapshot.review?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(verdict: TrainingReviewVerdict) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/studio/training/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rvtr, department, verdict, note: note.trim() || null }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "save_failed");
      setMessage(`Saved: ${verdict.replace(/_/g, " ")}`);
      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rs-studio-review-panel rs-training-review" aria-labelledby="training-review-heading">
      <h2 id="training-review-heading" className="rs-training-review__title">
        Training Review
      </h2>
      {snapshot.review ? (
        <p className="rs-training-review__last">
          Last: <strong>{snapshot.review.verdict.replace(/_/g, " ")}</strong>
          {" · "}
          {new Date(snapshot.review.reviewedAt).toLocaleString()}
        </p>
      ) : (
        <p className="rs-training-review__last">No review recorded yet.</p>
      )}
      <label className="rs-training-review__note-label">
        Optional note
        <textarea
          className="rs-training-review__note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder='e.g. "Too many timeline facts."'
        />
      </label>
      <div className="rs-training-review__actions">
        {VERDICTS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`rs-training-review__btn rs-training-review__btn--${v.id}`}
            disabled={busy}
            onClick={() => submit(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      {message ? <p className="rs-training-review__msg">{message}</p> : null}
    </section>
  );
}
