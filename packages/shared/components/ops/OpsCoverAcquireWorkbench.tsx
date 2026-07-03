"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ArchiveCoverPlate } from "@/components/artwork/ArchiveCoverPlate";
import { buildDiscogsSearchUrl } from "@/lib/cover-integrity/discogs-url";
import type { AcquireBatchRow } from "@/lib/ops/review/covers/acquire-batch";
import type { CoverTrainingDecisionValue } from "@/lib/rv12/training-decisions";

type Props = {
  batchId: string;
  batch: AcquireBatchRow[];
  batchSize: number;
  initialDecisions: Record<string, { decision: CoverTrainingDecisionValue }>;
  decisionsApi?: string;
  advanceBatchApi?: string;
};

export function OpsCoverAcquireWorkbench({
  batchId,
  batch,
  batchSize,
  initialDecisions,
  decisionsApi = "/api/ops/covers/train/decisions",
  advanceBatchApi = "/api/ops/review/covers/advance-batch?mode=acquire",
}: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const advanceStarted = useRef(false);

  useEffect(() => {
    setAdvancing(false);
    advanceStarted.current = false;
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
          : "Could not load the next albums. Please ask an operator for help.",
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
      if (!row) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(decisionsApi, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rval: row.rval,
            artist: row.artist,
            album: row.album,
            releaseYear: row.releaseYear,
            currentHash: null,
            proposedHash: null,
            proposedSource: "acquire_queue",
            decision,
            confidence: "medium",
            reason: "acquire_missing_cover",
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
    [row, decisionsApi],
  );

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
        void saveDecision("needs_pull");
      }
      if (e.key === "2") {
        e.preventDefault();
        void saveDecision("unsure");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue.length, saveDecision, advancing]);

  if (batch.length === 0 && !advancing) {
    return (
      <div className="ops-cover-train__learning" aria-live="polite">
        <h2>No acquire reviews queued</h2>
        <p className="ops-cover-train__text">
          Could not load missing-cover albums. Check Postgres connectivity.
        </p>
      </div>
    );
  }

  if (batchComplete || advancing) {
    return (
      <div className="ops-cover-train__learning" aria-live="polite">
        <div className="ops-cover-train__learning-spinner" aria-hidden />
        <h2>Retroverse is learning from your decisions…</h2>
        <p className="ops-cover-train__text">
          Retraining weights and building the next {batchSize} albums.
        </p>
        {error ? <p className="ops-cover-train__error">{error}</p> : null}
      </div>
    );
  }

  if (!row) return null;

  const discogsUrl = buildDiscogsSearchUrl(row.artist, row.album, row.releaseYear);

  return (
    <div className="ops-cover-train">
      <p className="ops-cover-train__progress-bar" aria-live="polite">
        Progress: <strong>{completedCount}</strong> of {batch.length} completed
      </p>

      <p className="ops-cover-train__task">This album has no cover yet. How should we prioritize it?</p>

      <header className="ops-cover-train__album-card">
        <p className="ops-cover-train__artist">{row.artist}</p>
        <h2 className="ops-cover-train__album-title">{row.album}</h2>
        {row.releaseYear != null ? (
          <p className="ops-cover-train__year">{row.releaseYear}</p>
        ) : null}
        <p className="ops-cover-train__rval">{row.rval}</p>
      </header>

      <section className="ops-cover-train__why" aria-labelledby="acquire-why-heading">
        <h3 id="acquire-why-heading" className="ops-cover-train__why-title">
          Why are you seeing this?
        </h3>
        <p className="ops-cover-train__why-body">
          Retroverse has chart metadata for this album but no cover image in the graph yet.
          {row.b200Peak != null
            ? ` Billboard 200 peak: #${row.b200Peak}.`
            : " No Billboard 200 peak on file."}
        </p>
      </section>

      <figure className="ops-cover-train__pane ops-cover-train__pane--solo">
        <figcaption>Current state</figcaption>
        <div className="ops-cover-train__frame ops-cover-train__frame--plate">
          <ArchiveCoverPlate
            context={{
              rval: row.rval,
              artist: row.artist,
              album: row.album,
              releaseYear: row.releaseYear,
            }}
            density="compact"
            className="ops-cover-train__fallback-plate"
          />
        </div>
      </figure>

      <p className="ops-cover-train__discogs">
        <a href={discogsUrl} target="_blank" rel="noopener noreferrer">
          Search Discogs for this album ↗
        </a>
        <span className="ops-cover-train__discogs-note"> (reference only — no auto-download)</span>
      </p>

      <div className="ops-cover-train__actions ops-cover-train__actions--acquire">
        <button
          type="button"
          className="ops-cover-train__choice ops-cover-train__choice--pull"
          disabled={saving}
          onClick={() => void saveDecision("needs_pull")}
        >
          <span className="ops-cover-train__choice-label">Needs Cover</span>
          <span className="ops-cover-train__choice-help">Prioritize sourcing this album.</span>
          <span className="ops-cover-train__choice-key">Press 1</span>
        </button>
        <button
          type="button"
          className="ops-cover-train__choice"
          disabled={saving}
          onClick={() => void saveDecision("unsure")}
        >
          <span className="ops-cover-train__choice-label">Not Sure</span>
          <span className="ops-cover-train__choice-help">Skip priority for now.</span>
          <span className="ops-cover-train__choice-key">Press 2</span>
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
