"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { OpsCoverInspectImage } from "@/components/ops/OpsCoverInspectImage";
import type { CoverAuditHashRow } from "@/lib/cover-integrity/load-cover-audit-csv";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import {
  buildPathToHashIndex,
  getTrainingRowContext,
  isTrivialTrainingPair,
  trainingCandidateSourceLabel,
  trainingWhyExplanation,
} from "@/lib/cover-integrity/training-display";
import type { CoverTrainingDecisionValue } from "@/lib/rv12/training-decisions";

type Props = {
  batchId: string;
  batch: RepairBatchCsvRow[];
  batchSize: number;
  initialDecisions: Record<string, { decision: CoverTrainingDecisionValue }>;
  hashMatches: Record<string, CoverAuditHashRow[]>;
  decisionsApi?: string;
  advanceBatchApi?: string;
};

export function OpsCoverTrainWorkbench({
  batchId,
  batch,
  batchSize,
  initialDecisions,
  hashMatches,
  decisionsApi = "/api/ops/covers/train/decisions",
  advanceBatchApi = "/api/ops/covers/train/advance-batch",
}: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const advanceStarted = useRef(false);
  const skipTrivialStarted = useRef<string | null>(null);

  const pathToHash = useMemo(
    () => buildPathToHashIndex(batch, hashMatches),
    [batch, hashMatches],
  );

  useEffect(() => {
    setAdvancing(false);
    advanceStarted.current = false;
    skipTrivialStarted.current = null;
  }, [batchId, batch.map((r) => r.rval).join(",")]);

  const pendingIndices = useMemo(
    () =>
      batch
        .map((row, i) => ({ row, i }))
        .filter(({ row }) => !decisions[row.rval])
        .map(({ i }) => i),
    [batch, decisions],
  );

  const queue = pendingIndices.map((i) => batch[i]!);
  const safeIndex = queue.length === 0 ? 0 : Math.min(index, queue.length - 1);
  const row = queue[safeIndex];
  const batchComplete = queue.length === 0 && batch.length > 0;

  const ctx = row ? getTrainingRowContext(row, hashMatches, pathToHash) : null;
  const whyText = row && ctx ? trainingWhyExplanation(row, ctx.candidateSource) : "";
  const candidateLabel = ctx ? trainingCandidateSourceLabel(ctx.candidateSource) : null;

  const completedCount = batch.filter((r) => decisions[r.rval]).length;

  const advanceBatch = useCallback(async () => {
    setAdvancing(true);
    setError(null);
    try {
      const res = await fetch(advanceBatchApi, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not build the next set");
      }
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load the next covers. Please ask an operator for help.",
      );
      setAdvancing(false);
    }
  }, [router, advanceBatchApi]);

  useEffect(() => {
    if (!batchComplete || advanceStarted.current) return;
    advanceStarted.current = true;
    void advanceBatch();
  }, [batchComplete, advanceBatch]);

  const saveDecision = useCallback(
    async (decision: CoverTrainingDecisionValue) => {
      if (!row || !ctx) return;
      setSaving(true);
      setError(null);
      try {
        const reason = row.issueReason.includes("same_artist")
          ? "same_artist_shared_image"
          : row.issueReason.split("|")[0] ?? "review";

        const res = await fetch(decisionsApi, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rval: row.rval,
            artist: row.artist,
            album: row.album,
            releaseYear: row.releaseYear,
            currentHash: row.currentHash,
            proposedHash: ctx.proposedHash,
            proposedSource: row.proposedSource,
            decision,
            confidence: "medium",
            reason,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? "Could not save your choice");
        }
        setDecisions((prev) => ({ ...prev, [row.rval]: { decision } }));
        setIndex(0);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [row, ctx, decisionsApi],
  );

  useEffect(() => {
    if (!row || !ctx || saving || advancing) return;
    if (!isTrivialTrainingPair(row, ctx)) return;
    if (skipTrivialStarted.current === row.rval) return;
    skipTrivialStarted.current = row.rval;
    void saveDecision("correct");
  }, [row, ctx, saving, advancing, saveDecision]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField =
        e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement;
      if (inField || advancing) return;

      if (e.key === "ArrowRight" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(0, queue.length - 1)));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "1") {
        e.preventDefault();
        void saveDecision("correct");
      }
      if (e.key === "2") {
        e.preventDefault();
        void saveDecision("wrong");
      }
      if (e.key === "3") {
        e.preventDefault();
        void saveDecision("unsure");
      }
      if (e.key === "4") {
        e.preventDefault();
        void saveDecision("needs_pull");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue.length, saveDecision, advancing]);

  if (batch.length === 0 && !advancing) {
    return (
      <div className="ops-cover-train__learning" aria-live="polite">
        <h2>No integrity reviews queued</h2>
        <p className="ops-cover-train__text">
          The suspicious-cover pool is exhausted or all candidates were already reviewed.
          Try <strong>Retrain weights</strong> or run <code>npm run cover:repair-batch</code> then refresh.
        </p>
      </div>
    );
  }

  if (batchComplete || advancing) {
    return (
      <div className="ops-cover-train__learning" aria-live="polite">
        <div className="ops-cover-train__learning-spinner" aria-hidden />
        <h2>Retroverse is learning from your decisions…</h2>
        <p className="ops-cover-train__text">Building the next review set.</p>
        <p className="ops-cover-train__text">
          You&apos;ll see <strong>{batchSize} new covers</strong> in a moment.
        </p>
        {error ? <p className="ops-cover-train__error">{error}</p> : null}
      </div>
    );
  }

  if (!row || !ctx) return null;

  if (isTrivialTrainingPair(row, ctx)) {
    return (
      <p className="ops-cover-train__text" aria-live="polite">
        Skipping a duplicate image pair…
      </p>
    );
  }

  return (
    <div className="ops-cover-train">
      <p className="ops-cover-train__progress-bar" aria-live="polite">
        Progress: <strong>{completedCount}</strong> of {batch.length} completed
      </p>

      <p className="ops-cover-train__task">Is this the correct album cover for this album?</p>

      <header className="ops-cover-train__album-card">
        <p className="ops-cover-train__artist">{row.artist}</p>
        <h2 className="ops-cover-train__album-title">{row.album}</h2>
        {row.releaseYear != null ? (
          <p className="ops-cover-train__year">{row.releaseYear}</p>
        ) : null}
      </header>

      <section className="ops-cover-train__why" aria-labelledby="why-heading">
        <h3 id="why-heading" className="ops-cover-train__why-title">
          Why are you seeing this?
        </h3>
        <p className="ops-cover-train__why-body">{whyText}</p>
      </section>

      <div className="ops-cover-train__pair">
        <figure className="ops-cover-train__pane">
          <figcaption>Current Cover</figcaption>
          <div className="ops-cover-train__frame">
            <OpsCoverInspectImage
              path={row.currentCoverPath}
              label="Current cover"
              className="ops-cover-train__art"
              fit="contain"
            />
          </div>
        </figure>
        <figure className="ops-cover-train__pane">
          <figcaption>Possible Better Cover</figcaption>
          {candidateLabel ? (
            <p className="ops-cover-train__candidate-source">
              <span className="ops-cover-train__candidate-source-label">Candidate source:</span>
              {candidateLabel}
            </p>
          ) : null}
          {ctx.proposedPath ? (
            <div className="ops-cover-train__frame">
              <OpsCoverInspectImage
                path={ctx.proposedPath}
                label="Possible better cover"
                className="ops-cover-train__art"
                fit="contain"
              />
            </div>
          ) : (
            <div className="ops-cover-train__empty">
              No other picture to compare yet. If the current cover looks wrong, choose
              &ldquo;Need better image.&rdquo;
            </div>
          )}
        </figure>
      </div>

      <div className="ops-cover-train__actions">
        <button
          type="button"
          className="ops-cover-train__choice ops-cover-train__choice--keep"
          disabled={saving}
          onClick={() => void saveDecision("correct")}
        >
          <span className="ops-cover-train__choice-label">Keep Current</span>
          <span className="ops-cover-train__choice-help">The current cover looks correct.</span>
          <span className="ops-cover-train__choice-key">Press 1</span>
        </button>
        <button
          type="button"
          className="ops-cover-train__choice ops-cover-train__choice--use"
          disabled={saving || !ctx.proposedPath}
          onClick={() => void saveDecision("wrong")}
        >
          <span className="ops-cover-train__choice-label">Use Suggested</span>
          <span className="ops-cover-train__choice-help">The new cover is better.</span>
          <span className="ops-cover-train__choice-key">Press 2</span>
        </button>
        <button
          type="button"
          className="ops-cover-train__choice"
          disabled={saving}
          onClick={() => void saveDecision("unsure")}
        >
          <span className="ops-cover-train__choice-label">Not Sure</span>
          <span className="ops-cover-train__choice-help">I can&apos;t tell.</span>
          <span className="ops-cover-train__choice-key">Press 3</span>
        </button>
        <button
          type="button"
          className="ops-cover-train__choice ops-cover-train__choice--pull"
          disabled={saving}
          onClick={() => void saveDecision("needs_pull")}
        >
          <span className="ops-cover-train__choice-label">Need Better Image</span>
          <span className="ops-cover-train__choice-help">Neither image is good enough.</span>
          <span className="ops-cover-train__choice-key">Press 4</span>
        </button>
      </div>

      <div className="ops-cover-train__nav">
        <button
          type="button"
          className="ops-cover-train__nav-btn"
          disabled={safeIndex <= 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ← Previous
        </button>
        <button
          type="button"
          className="ops-cover-train__nav-btn"
          disabled={safeIndex >= queue.length - 1}
          onClick={() => setIndex((i) => Math.min(queue.length - 1, i + 1))}
        >
          Next →
        </button>
      </div>

      {error ? <p className="ops-cover-train__error">{error}</p> : null}
      {saving ? <p className="ops-cover-train__saving">Saving your choice…</p> : null}
    </div>
  );
}
