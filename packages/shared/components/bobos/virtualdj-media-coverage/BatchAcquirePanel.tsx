"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { candidateTypeLabel } from "@/lib/ops/video-acquisition/classify-candidate";
import { formatDuration } from "@/lib/ops/video-acquisition/filenames";
import type {
  BatchAcquireItem,
  BatchAcquireManifest,
  BatchAcquireSummary,
} from "@/lib/ops/video-acquisition/types";

const BATCH_STORAGE_KEY = "vmc-active-batch-id";
const PILOT_LIMIT = 3;

type PreviewItem = {
  targetRowKey: string;
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  chartRank: number;
};

type Props = {
  scanId: string | null;
  filter: string;
  disabled?: boolean;
  onRescanComplete?: () => void;
};

function summaryCards(summary: BatchAcquireSummary) {
  return [
    ["Queued", summary.queued],
    ["Searching", summary.searching],
    ["Downloaded", summary.downloaded],
    ["Needs Review", summary.needsReview],
    ["Failed", summary.failed],
    ["Complete", summary.complete],
    ["Awaiting Rescan", summary.awaitingRescan],
  ] as const;
}

export function BatchAcquirePanel({ scanId, filter, disabled, onRescanComplete }: Props) {
  const [batch, setBatch] = useState<BatchAcquireManifest | null>(null);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [chooseFor, setChooseFor] = useState<BatchAcquireItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rescanInstructions, setRescanInstructions] = useState<string[] | null>(null);

  const reviewItems = useMemo(
    () => batch?.items.filter((item) => item.downloadStatus === "needs_review") ?? [],
    [batch],
  );

  const refreshBatch = useCallback(async (batchId: string) => {
    const res = await fetch(`/api/ops/virtualdj-media-coverage/batch-acquire/${batchId}`, {
      cache: "no-store",
    });
    const body = (await res.json()) as { ok?: boolean; batch?: BatchAcquireManifest; error?: string };
    if (!res.ok || !body.ok || !body.batch) {
      throw new Error(body.error ?? "Could not load batch");
    }
    setBatch(body.batch);
    window.localStorage.setItem(BATCH_STORAGE_KEY, batchId);
    return body.batch;
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(BATCH_STORAGE_KEY);
    if (!saved) return;
    void refreshBatch(saved).catch(() => {
      window.localStorage.removeItem(BATCH_STORAGE_KEY);
    });
  }, [refreshBatch]);

  useEffect(() => {
    if (!batch?.batchId) return;
    if (batch.status !== "running" && batch.status !== "queued") return;
    const timer = window.setInterval(() => {
      void refreshBatch(batch.batchId).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [batch?.batchId, batch?.status, refreshBatch]);

  async function requestPreview() {
    if (!scanId) {
      setError("Run a coverage scan first.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/virtualdj-media-coverage/batch-acquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          filter,
          limit: PILOT_LIMIT,
          confirm: false,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        items?: PreviewItem[];
        scanLabel?: string | null;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.items?.length) {
        throw new Error(body.error ?? "No eligible songs found for batch acquisition.");
      }
      setPreview(body.items);
      setPreviewLabel(body.scanLabel ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function confirmBatch() {
    if (!scanId || !preview?.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/virtualdj-media-coverage/batch-acquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          filter,
          limit: PILOT_LIMIT,
          confirm: true,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; batch?: BatchAcquireManifest; error?: string };
      if (!res.ok || !body.ok || !body.batch) {
        throw new Error(body.error ?? "Could not start batch acquisition.");
      }
      setBatch(body.batch);
      setPreview(null);
      setNotice(`Pilot batch started for ${body.batch.items.length} songs.`);
      window.localStorage.setItem(BATCH_STORAGE_KEY, body.batch.batchId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function runReviewAction(action: "keep" | "reject", item: BatchAcquireItem) {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/virtualdj-media-coverage/batch-acquire/${batch.batchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetRowKey: item.targetRowKey }),
      });
      const body = (await res.json()) as { ok?: boolean; batch?: BatchAcquireManifest; error?: string };
      if (!res.ok || !body.ok || !body.batch) throw new Error(body.error ?? "Review action failed");
      setBatch(body.batch);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function chooseCandidate(item: BatchAcquireItem, videoId: string) {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/virtualdj-media-coverage/batch-acquire/${batch.batchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "choose",
          targetRowKey: item.targetRowKey,
          videoId,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; batch?: BatchAcquireManifest; error?: string };
      if (!res.ok || !body.ok || !body.batch) throw new Error(body.error ?? "Could not choose candidate");
      setBatch(body.batch);
      setChooseFor(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function beginRescan() {
    if (!batch) {
      setError("No active batch to recheck.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/virtualdj-media-coverage/rescan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batch.batchId, confirm: false }),
      });
      const body = (await res.json()) as { ok?: boolean; instructions?: string[]; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? "Could not load rescan instructions");
      setRescanInstructions(body.instructions ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function confirmRescan() {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/virtualdj-media-coverage/rescan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batch.batchId, confirm: true }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        batch?: BatchAcquireManifest;
        completed?: string[];
        stillAwaiting?: string[];
        error?: string;
      };
      if (!res.ok || !body.ok || !body.batch) throw new Error(body.error ?? "Rescan recheck failed");
      setBatch(body.batch);
      setRescanInstructions(null);
      setNotice(
        `Rescan recheck complete. ${body.completed?.length ?? 0} labeled, ${body.stillAwaiting?.length ?? 0} still awaiting scan.`,
      );
      onRescanComplete?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="vmc-batch" aria-label="Batch video acquisition">
      <div className="vmc-batch__toolbar">
        <button
          className="vmc-button vmc-button--primary"
          disabled={disabled || busy || !scanId}
          onClick={() => void requestPreview()}
          type="button"
        >
          ACQUIRE TOP 25
        </button>
        <button
          className="vmc-button"
          disabled={!batch || busy || reviewItems.length === 0}
          onClick={() => setReviewOpen(true)}
          type="button"
        >
          REVIEW DOWNLOADS ({reviewItems.length})
        </button>
        <button
          className="vmc-button"
          disabled={!batch || busy || (batch.summary.awaitingRescan ?? 0) === 0}
          onClick={() => void beginRescan()}
          type="button"
        >
          RESCAN LIBRARY
        </button>
        <span className="vmc-batch__pilot">Pilot limit: {PILOT_LIMIT}</span>
      </div>

      {error ? <p className="vmc-error vmc-batch__message" role="alert">{error}</p> : null}
      {notice ? <p className="vmc-batch__message vmc-muted">{notice}</p> : null}

      {preview ? (
        <div className="vmc-batch__preview">
          <h3>Confirm pilot batch</h3>
          <p className="vmc-muted">{previewLabel ?? "Selected scan"} · filter: {filter} · {preview.length} songs</p>
          <ol>
            {preview.map((item) => (
              <li key={item.targetRowKey}>
                #{item.chartRank} · {item.artist} — {item.title} · {item.rvtr}
              </li>
            ))}
          </ol>
          <div className="vmc-batch__preview-actions">
            <button className="vmc-button vmc-button--primary" disabled={busy} onClick={() => void confirmBatch()} type="button">
              Start {preview.length}-song pilot
            </button>
            <button className="vmc-button" disabled={busy} onClick={() => setPreview(null)} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {batch ? (
        <div className="vmc-batch__summary">
          {summaryCards(batch.summary).map(([label, value]) => (
            <div className="vmc-batch__summary-card" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {rescanInstructions ? (
        <div className="vmc-batch__rescan">
          <h3>VirtualDJ rescan required</h3>
          <ol>
            {rescanInstructions.map((line) => <li key={line}>{line}</li>)}
          </ol>
          <div className="vmc-batch__preview-actions">
            <button className="vmc-button vmc-button--primary" disabled={busy} onClick={() => void confirmRescan()} type="button">
              I completed the VirtualDJ scan
            </button>
            <button className="vmc-button" disabled={busy} onClick={() => setRescanInstructions(null)} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {reviewOpen ? (
        <aside className="vmc-batch__drawer" aria-label="Batch review queue">
          <div className="vmc-batch__drawer-head">
            <h3>Review downloads</h3>
            <button className="vmc-button vmc-button--quiet" onClick={() => setReviewOpen(false)} type="button">
              Close
            </button>
          </div>
          {reviewItems.length === 0 ? (
            <p className="vmc-muted">No items need review.</p>
          ) : (
            reviewItems.map((item) => (
              <article className="vmc-batch__review-card" key={item.targetRowKey}>
                <div className="vmc-batch__review-main">
                  {item.candidateThumbnailUrl ? (
                    <img alt="" className="vmc-batch__thumb" src={item.candidateThumbnailUrl} />
                  ) : null}
                  <div>
                    <strong>{item.artist} — {item.title}</strong>
                    <p>{item.candidateTitle ?? "Candidate"}</p>
                    <p className="vmc-muted">{item.candidateChannel ?? "Unknown channel"} · {formatDuration(item.durationSeconds)}</p>
                    <ul className="vmc-batch__reasons">
                      {item.confidenceReasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="vmc-batch__review-actions">
                  <button className="vmc-button vmc-button--primary" disabled={busy} onClick={() => void runReviewAction("keep", item)} type="button">
                    KEEP
                  </button>
                  <button className="vmc-button" disabled={busy} onClick={() => setChooseFor(item)} type="button">
                    CHOOSE ANOTHER
                  </button>
                  <button className="vmc-button" disabled={busy} onClick={() => void runReviewAction("reject", item)} type="button">
                    REJECT
                  </button>
                </div>
                {chooseFor?.targetRowKey === item.targetRowKey ? (
                  <div className="vmc-batch__choose-list">
                    {item.searchCandidates.map((candidate) => (
                      <button
                        className="vmc-button"
                        disabled={busy}
                        key={candidate.videoId}
                        onClick={() => void chooseCandidate(item, candidate.videoId)}
                        type="button"
                      >
                        {candidate.title} · {candidate.channel} · {candidateTypeLabel(candidate.candidateType)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </aside>
      ) : null}
    </section>
  );
}
