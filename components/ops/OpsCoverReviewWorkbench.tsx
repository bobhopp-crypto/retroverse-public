"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OpsCoverInspectImage } from "@/components/ops/OpsCoverInspectImage";
import type { CoverAuditHashRow } from "@/lib/cover-integrity/load-cover-audit-csv";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import { buildDiscogsSearchUrl } from "@/lib/cover-integrity/discogs-url";
import type {
  CoverRepairDecision,
  CoverRepairDecisionValue,
  CuratorConfidence,
} from "@/lib/cover-integrity/repair-decisions-store";
import { isSafeCanonicalCoverPath } from "@/lib/cover-integrity/validate-cover-path";
import { OpsCoverRv12Actions } from "@/components/ops/OpsCoverRv12Actions";

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

function trustTierClass(tier: string): string {
  const t = tier.toUpperCase();
  if (t === "TRUSTED") return "ops-cover-review__tier--trusted";
  if (t === "HIGH_RISK") return "ops-cover-review__tier--high-risk";
  if (t === "BROKEN") return "ops-cover-review__tier--broken";
  return "ops-cover-review__tier--review";
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
  const [compareOpen, setCompareOpen] = useState(false);
  const [discogsOpen, setDiscogsOpen] = useState(false);

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
    setCompareOpen(false);
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

      if (e.key === "Escape") {
        if (compareOpen) {
          setCompareOpen(false);
          return;
        }
        if (discogsOpen) {
          setDiscogsOpen(false);
          return;
        }
      }

      if (inField && e.key !== "Escape") return;

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
        void saveDecision("skip", false);
      }
      if (e.key === "p" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        void saveDecision("needs_discogs_pull");
      }
      if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setCompareOpen((v) => !v);
      }
      if (e.key === "d" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setDiscogsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue.length, saveDecision, compareOpen, discogsOpen]);

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

  const proposedIsPath =
    row.proposedCoverUrlOrPath && isSafeCanonicalCoverPath(row.proposedCoverUrlOrPath);

  return (
    <div className={`ops-cover-review${discogsOpen ? " ops-cover-review--discogs-open" : ""}`}>
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

      <div className="ops-cover-review__workspace">
        <article className="ops-cover-review__card">
          <header className="ops-cover-review__head">
            <div>
              <h2 className="ops-cover-review__title">
                {row.artist} — {row.album}
              </h2>
              <p className="ops-cover-review__meta">
                {row.rval}
                {row.releaseYear != null ? ` · ${row.releaseYear}` : ""} · dup×
                {row.duplicateHashCount}
              </p>
            </div>
            <div className="ops-cover-review__chips">
              <span className={`ops-cover-review__tier ${trustTierClass(row.trustTier)}`}>
                {row.trustTier}
              </span>
              {existing ? (
                <span
                  className={`ops-cover-review__badge ops-cover-review__badge--${existing.decision}`}
                >
                  {existing.decision}
                </span>
              ) : null}
            </div>
          </header>

          <p className="ops-cover-review__issue">{row.issueReason}</p>

          <div className="ops-cover-review__art-row">
            <figure className="ops-cover-review__art-block">
              <figcaption>Current assignment</figcaption>
              <OpsCoverInspectImage path={row.currentCoverPath} label="Current cover" />
              <code className="ops-cover-review__hash">{row.currentHash ?? "—"}</code>
            </figure>
            {proposedIsPath ? (
              <figure className="ops-cover-review__art-block">
                <figcaption>Proposed file</figcaption>
                <OpsCoverInspectImage
                  path={row.proposedCoverUrlOrPath}
                  label="Proposed cover"
                />
              </figure>
            ) : null}
          </div>

          <div className="ops-cover-review__discogs-actions">
            <button
              type="button"
              className="ops-cover-review__btn ops-cover-review__btn--discogs"
              onClick={() => setDiscogsOpen(true)}
            >
              Open Discogs in panel (D)
            </button>
            <a
              className="ops-cover-review__btn ops-cover-review__btn--ghost"
              href={discogsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              External tab ↗
            </a>
            <button
              type="button"
              className="ops-cover-review__btn ops-cover-review__btn--compare"
              onClick={() => setCompareOpen((v) => !v)}
              disabled={hashSiblings.length < 2}
            >
              Compare hash matches (C) · {hashSiblings.length || 0}
            </button>
          </div>

          {compareOpen && hashSiblings.length >= 2 ? (
            <section className="ops-cover-review__compare" aria-label="Hash comparison">
              <h3 className="ops-cover-review__compare-title">
                Same image hash ({hashSiblings.length} albums)
              </h3>
              <div className="ops-cover-review__compare-grid">
                {hashSiblings.map((m) => (
                  <div
                    key={m.rval}
                    className={`ops-cover-review__compare-item${m.rval === row.rval ? " ops-cover-review__compare-item--current" : ""}`}
                  >
                    <OpsCoverInspectImage
                      path={m.canonicalPath}
                      label={`${m.artist} ${m.album}`}
                      className="ops-cover-review__compare-art"
                    />
                    <p className="ops-cover-review__compare-album">{m.album}</p>
                    <p className="ops-cover-review__compare-artist">{m.artist}</p>
                    <p className="ops-cover-review__compare-year">
                      {m.releaseYear ?? "—"} · {m.rval}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <p className="ops-cover-review__reason">{row.proposedReason}</p>

          <fieldset className="ops-cover-review__confidence">
            <legend>Decision confidence</legend>
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
            Curator notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="RV12 notes (local JSON only)"
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
              onClick={() => void saveDecision("skip", false)}
            >
              Skip (S)
            </button>
            <button
              type="button"
              className="ops-cover-review__btn ops-cover-review__btn--pull"
              disabled={saving}
              onClick={() => void saveDecision("needs_discogs_pull")}
            >
              Need Discogs pull (P)
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

          <OpsCoverRv12Actions
            row={row}
            coverApplyEnabled={coverApplyEnabled}
            isPilot={row.rval === "RVAL823723"}
          />

          {error ? <p className="ops-cover-review__error">{error}</p> : null}
          {saving ? <p className="ops-dim">Saving…</p> : null}
        </article>

        {discogsOpen && discogsEmbedSrc ? (
          <aside className="ops-cover-review__discogs" aria-label="Discogs search panel">
            <div className="ops-cover-review__discogs-head">
              <strong>Discogs</strong>
              <button type="button" className="ops-cover-review__btn--ghost" onClick={() => setDiscogsOpen(false)}>
                Close (Esc)
              </button>
            </div>
            <iframe className="ops-cover-review__discogs-frame" src={discogsEmbedSrc} title="Discogs" />
          </aside>
        ) : null}
      </div>

      <p className="ops-cover-review__hint ops-dim">
        A approve · R reject · S skip · P need pull · C compare · D discogs · J/K nav · review only
      </p>
    </div>
  );
}
