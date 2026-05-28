"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import type {
  CoverRepairDecision,
  CoverRepairDecisionValue,
} from "@/lib/cover-integrity/repair-decisions-store";
import { isSafeCanonicalCoverPath } from "@/lib/cover-integrity/validate-cover-path";

type Props = {
  batch: RepairBatchCsvRow[];
  initialDecisions: Record<string, CoverRepairDecision>;
};

function thumbnailSrc(path: string | null): string | null {
  if (!path || !isSafeCanonicalCoverPath(path)) return null;
  return `/api/ops/covers/thumbnail?path=${encodeURIComponent(path)}`;
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function OpsCoverReviewWorkbench({ batch, initialDecisions }: Props) {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const pendingIndices = useMemo(() => {
    return batch
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => !decisions[row.rval])
      .map(({ i }) => i);
  }, [batch, decisions]);

  const queue = showPendingOnly
    ? pendingIndices.map((i) => batch[i]!)
    : batch;

  const safeIndex = queue.length === 0 ? 0 : Math.min(index, queue.length - 1);
  const row = queue[safeIndex];
  const existing = row ? decisions[row.rval] : undefined;

  useEffect(() => {
    setNotes(existing?.curatorNotes ?? row?.curatorNotes ?? "");
  }, [row?.rval, existing?.curatorNotes, row?.curatorNotes]);

  const reviewedCount = Object.keys(decisions).length;

  const saveDecision = useCallback(
    async (decision: CoverRepairDecisionValue) => {
      if (!row) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/ops/covers/decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rval: row.rval,
            decision,
            curatorNotes: notes,
            proposedSource: row.proposedSource,
            proposedCoverUrlOrPath: row.proposedCoverUrlOrPath,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const reviewedAt = new Date().toISOString();
        setDecisions((prev) => ({
          ...prev,
          [row.rval]: {
            rval: row.rval,
            decision,
            curatorNotes: notes,
            reviewedAt,
            proposedSource: row.proposedSource,
            proposedCoverUrlOrPath: row.proposedCoverUrlOrPath,
          },
        }));
        if (safeIndex < queue.length - 1) {
          setIndex(safeIndex + 1);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [row, notes, safeIndex, queue.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        if (e.key !== "Escape") return;
      }
      if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, queue.length - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "a" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        void saveDecision("approve");
      }
      if (e.key === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        void saveDecision("reject");
      }
      if (e.key === "s" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        void saveDecision("skip");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue.length, saveDecision]);

  if (batch.length === 0) {
    return (
      <p className="ops-dim">
        No repair batch rows. Run <code>npm run cover:repair-batch</code> first.
      </p>
    );
  }

  if (!row) {
    return (
      <p className="ops-dim">
        All pending rows reviewed ({reviewedCount}/{batch.length}).
      </p>
    );
  }

  const currentThumb = thumbnailSrc(row.currentCoverPath);
  const proposedIsPath =
    row.proposedCoverUrlOrPath && isSafeCanonicalCoverPath(row.proposedCoverUrlOrPath);
  const proposedThumb = proposedIsPath
    ? thumbnailSrc(row.proposedCoverUrlOrPath)
    : null;

  return (
    <div className="ops-cover-review">
      <div className="ops-cover-review__toolbar">
        <span>
          #{row.batchRank} · {safeIndex + 1}/{queue.length}
          {showPendingOnly ? " pending" : ` of ${batch.length}`}
        </span>
        <span>
          Reviewed <strong>{reviewedCount}</strong>/{batch.length}
        </span>
        <label className="ops-cover-review__toggle">
          <input
            type="checkbox"
            checked={showPendingOnly}
            onChange={(e) => {
              setShowPendingOnly(e.target.checked);
              setIndex(0);
            }}
          />
          Pending only
        </label>
      </div>

      <article className="ops-cover-review__card">
        <header className="ops-cover-review__head">
          <div>
            <h2 className="ops-cover-review__title">
              {row.artist} — {row.album}
            </h2>
            <p className="ops-cover-review__meta">
              {row.rval}
              {row.releaseYear != null ? ` · ${row.releaseYear}` : ""} · {row.trustTier} · dup×
              {row.duplicateHashCount}
            </p>
          </div>
          {existing ? (
            <span className={`ops-cover-review__badge ops-cover-review__badge--${existing.decision}`}>
              {existing.decision}
            </span>
          ) : null}
        </header>

        <p className="ops-cover-review__issue">{row.issueReason}</p>

        <div className="ops-cover-review__covers">
          <figure>
            <figcaption>Current assignment</figcaption>
            {currentThumb ? (
              <img src={currentThumb} alt="" width={220} height={220} />
            ) : (
              <p className="ops-dim">No local thumbnail</p>
            )}
            <code>{row.currentCoverPath ?? "—"}</code>
            <code className="ops-cover-review__hash">{row.currentHash ?? "—"}</code>
          </figure>
          <figure>
            <figcaption>
              Proposed · {row.proposedSource} ({row.proposedConfidence}%)
            </figcaption>
            {proposedThumb ? (
              <img src={proposedThumb} alt="" width={220} height={220} />
            ) : isHttpUrl(row.proposedCoverUrlOrPath) ? (
              <a
                className="ops-link"
                href={row.proposedCoverUrlOrPath}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Discogs search
              </a>
            ) : (
              <p className="ops-dim">{row.proposedCoverUrlOrPath || "—"}</p>
            )}
            <p className="ops-cover-review__reason">{row.proposedReason}</p>
          </figure>
        </div>

        <label className="ops-cover-review__notes">
          Curator notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="RV12 review notes (local file only)"
          />
        </label>

        <div className="ops-cover-review__actions">
          <button
            type="button"
            className="ops-cover-review__btn ops-cover-review__btn--approve"
            disabled={saving}
            onClick={() => void saveDecision("approve")}
          >
            Approve (A)
          </button>
          <button
            type="button"
            className="ops-cover-review__btn ops-cover-review__btn--reject"
            disabled={saving}
            onClick={() => void saveDecision("reject")}
          >
            Reject (R)
          </button>
          <button
            type="button"
            className="ops-cover-review__btn"
            disabled={saving}
            onClick={() => void saveDecision("skip")}
          >
            Skip (S)
          </button>
          <button
            type="button"
            className="ops-cover-review__btn ops-cover-review__btn--ghost"
            disabled={safeIndex <= 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            ← Prev (K)
          </button>
          <button
            type="button"
            className="ops-cover-review__btn ops-cover-review__btn--ghost"
            disabled={safeIndex >= queue.length - 1}
            onClick={() => setIndex((i) => Math.min(queue.length - 1, i + 1))}
          >
            Next (J) →
          </button>
        </div>

        {error ? <p className="ops-cover-review__error">{error}</p> : null}
        {saving ? <p className="ops-dim">Saving decision…</p> : null}
      </article>

      <p className="ops-cover-review__hint ops-dim">
        RV12 workbench · review only · decisions saved to{" "}
        <code>reports/cover_integrity/repair_batch_001_decisions.json</code> · no canonical
        writes
      </p>
    </div>
  );
}
