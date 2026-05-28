"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OpsCoverInspectImage } from "@/components/ops/OpsCoverInspectImage";
import { OpsCoverRv12Actions } from "@/components/ops/OpsCoverRv12Actions";
import { OpsCoverTechnicalDetails } from "@/components/ops/OpsCoverTechnicalDetails";
import type { CoverAuditHashRow } from "@/lib/cover-integrity/load-cover-audit-csv";
import {
  humanRepairDecision,
  technicalDetailsFromRow,
} from "@/lib/cover-integrity/cover-human-labels";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import { buildDiscogsSearchUrl } from "@/lib/cover-integrity/discogs-url";
import type {
  CoverRepairDecision,
  CoverRepairDecisionValue,
  CuratorConfidence,
} from "@/lib/cover-integrity/repair-decisions-store";
import { isSafeCanonicalCoverPath } from "@/lib/cover-integrity/validate-cover-path";

type Props = {
  batch: RepairBatchCsvRow[];
  initialDecisions: Record<string, CoverRepairDecision>;
  hashMatches: Record<string, CoverAuditHashRow[]>;
  coverApplyEnabled: boolean;
};

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function discogsUrlForRow(row: RepairBatchCsvRow): string {
  if (isHttpUrl(row.proposedCoverUrlOrPath)) return row.proposedCoverUrlOrPath;
  return buildDiscogsSearchUrl(row.artist, row.album, row.releaseYear);
}

export function OpsCoverReviewWorkbench({
  batch,
  initialDecisions,
  hashMatches,
  coverApplyEnabled,
}: Props) {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState<CuratorConfidence>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(true);
  const [discogsOpen, setDiscogsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const pendingIndices = useMemo(() => {
    return batch
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => !decisions[row.rval])
      .map(({ i }) => i);
  }, [batch, decisions]);

  const queue = showPendingOnly ? pendingIndices.map((i) => batch[i]!) : batch;

  const safeIndex = queue.length === 0 ? 0 : Math.min(index, queue.length - 1);
  const row = queue[safeIndex];
  const existing = row ? decisions[row.rval] : undefined;

  const discogsSearchUrl = row ? discogsUrlForRow(row) : "";
  const discogsEmbedSrc = discogsSearchUrl
    ? `/ops/covers/embed?url=${encodeURIComponent(discogsSearchUrl)}`
    : null;

  const hashSiblings = row?.currentHash ? hashMatches[row.currentHash] ?? [] : [];

  useEffect(() => {
    setNotes(existing?.curatorNotes ?? row?.curatorNotes ?? "");
    setConfidence(existing?.curatorConfidence ?? "medium");
    setDiscogsOpen(false);
  }, [row?.rval, existing?.curatorNotes, existing?.curatorConfidence, row?.curatorNotes]);

  const reviewedCount = Object.keys(decisions).length;

  const advanceAfterDecision = useCallback(() => {
    if (showPendingOnly) {
      setIndex(0);
    } else {
      setIndex((i) => Math.min(i + 1, Math.max(0, queue.length - 1)));
    }
  }, [showPendingOnly, queue.length]);

  const saveDecision = useCallback(
    async (decision: CoverRepairDecisionValue, autoAdvance = true) => {
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
            curatorConfidence: confidence,
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
            curatorConfidence: confidence,
            curatorNotes: notes,
            reviewedAt,
            proposedSource: row.proposedSource,
            proposedCoverUrlOrPath: row.proposedCoverUrlOrPath,
          },
        }));
        if (autoAdvance) advanceAfterDecision();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [row, notes, confidence, advanceAfterDecision],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField =
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement;

      if (e.key === "Escape" && discogsOpen) {
        setDiscogsOpen(false);
        return;
      }

      if (inField && e.key !== "Escape") return;

      if (e.key === "ArrowRight" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, queue.length - 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        void saveDecision("approve");
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        void saveDecision("reject");
      }
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setDiscogsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue.length, saveDecision, discogsOpen]);

  if (batch.length === 0) {
    return <p className="ops-dim">No covers loaded for operator review.</p>;
  }

  if (!row) {
    return (
      <p className="ops-dim">
        All covers in this set are done ({reviewedCount}/{batch.length}).
      </p>
    );
  }

  const proposedIsPath =
    row.proposedCoverUrlOrPath && isSafeCanonicalCoverPath(row.proposedCoverUrlOrPath);

  const coverNumber = showPendingOnly
    ? batch.length - queue.length + safeIndex + 1
    : safeIndex + 1;

  return (
    <div className={`ops-cover-review${discogsOpen ? " ops-cover-review--discogs-open" : ""}`}>
      <div className="ops-cover-review__toolbar ops-cover-review__toolbar--simple">
        <span>
          Cover {coverNumber} of {batch.length}
        </span>
        <span>
          Done: <strong>{reviewedCount}</strong>
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
          Only not finished
        </label>
      </div>

      <div className="ops-cover-review__workspace">
        <article className="ops-cover-review__card ops-cover-review__card--operator">
          <header className="ops-cover-review__head ops-cover-review__head--simple">
            <h2 className="ops-cover-review__title">{row.artist}</h2>
            <p className="ops-cover-review__album-line">{row.album}</p>
            {row.releaseYear != null ? (
              <p className="ops-cover-review__year-line">{row.releaseYear}</p>
            ) : null}
            {existing ? (
              <p className="ops-cover-review__saved">
                Saved: {humanRepairDecision(existing.decision)}
              </p>
            ) : null}
          </header>

          <div className="ops-cover-review__art-row">
            <figure className="ops-cover-review__art-block">
              <figcaption>Current Cover</figcaption>
              <OpsCoverInspectImage path={row.currentCoverPath} label="Current cover" />
            </figure>
            {proposedIsPath ? (
              <figure className="ops-cover-review__art-block">
                <figcaption>Suggested Replacement</figcaption>
                <OpsCoverInspectImage
                  path={row.proposedCoverUrlOrPath}
                  label="Suggested cover"
                />
              </figure>
            ) : (
              <figure className="ops-cover-review__art-block">
                <figcaption>Suggested Replacement</figcaption>
                <div className="ops-cover-train__empty">
                  No local image — use Discogs to find art.
                </div>
              </figure>
            )}
          </div>

          <div className="ops-cover-review__discogs-actions">
            <button
              type="button"
              className="ops-cover-review__btn ops-cover-review__btn--discogs"
              onClick={() => setDiscogsOpen(true)}
            >
              Search Discogs
            </button>
            <a
              className="ops-cover-review__btn ops-cover-review__btn--ghost"
              href={discogsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in new tab
            </a>
          </div>

          <div className="ops-cover-review__actions ops-cover-review__actions--large">
            <button
              type="button"
              className="ops-cover-review__btn ops-cover-review__btn--approve"
              disabled={saving}
              onClick={() => void saveDecision("approve")}
            >
              Approve Fix
            </button>
            <button
              type="button"
              className="ops-cover-review__btn ops-cover-review__btn--reject"
              disabled={saving}
              onClick={() => void saveDecision("reject")}
            >
              Reject Suggestion
            </button>
            <button
              type="button"
              className="ops-cover-review__btn"
              disabled={saving}
              onClick={() => void saveDecision("skip", false)}
            >
              Skip
            </button>
            <button
              type="button"
              className="ops-cover-review__btn ops-cover-review__btn--pull"
              disabled={saving}
              onClick={() => void saveDecision("needs_discogs_pull")}
            >
              Need Better Source
            </button>
          </div>

          <div className="ops-cover-review__nav-row">
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

          <OpsCoverTechnicalDetails
            details={technicalDetailsFromRow(row)}
            hashSiblings={hashSiblings}
          />

          <details
            className="ops-cover-tech ops-cover-tech--advanced"
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="ops-cover-tech__summary">
              Advanced operator tools (upload, apply final cover)
            </summary>
            <div className="ops-cover-tech__advanced-inner">
              <fieldset className="ops-cover-review__confidence">
                <legend>How sure are you?</legend>
                {(["high", "medium", "low"] as const).map((level) => (
                  <label key={level}>
                    <input
                      type="radio"
                      name="curator-confidence"
                      value={level}
                      checked={confidence === level}
                      onChange={() => setConfidence(level)}
                    />
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </label>
                ))}
              </fieldset>

              <label className="ops-cover-review__notes">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes for this album"
                />
              </label>

              <OpsCoverRv12Actions
                row={row}
                coverApplyEnabled={coverApplyEnabled}
                isPilot={row.rval === "RVAL823723"}
              />
            </div>
          </details>

          {error ? <p className="ops-cover-review__error">{error}</p> : null}
          {saving ? <p className="ops-dim">Saving…</p> : null}
        </article>

        {discogsOpen && discogsEmbedSrc ? (
          <aside className="ops-cover-review__discogs" aria-label="Discogs search">
            <div className="ops-cover-review__discogs-head">
              <strong>Discogs</strong>
              <button
                type="button"
                className="ops-cover-review__btn--ghost"
                onClick={() => setDiscogsOpen(false)}
              >
                Close
              </button>
            </div>
            <iframe className="ops-cover-review__discogs-frame" src={discogsEmbedSrc} title="Discogs" />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
