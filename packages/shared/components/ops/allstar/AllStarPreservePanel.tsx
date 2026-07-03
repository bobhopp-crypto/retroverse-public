"use client";

import { useCallback, useEffect, useState } from "react";

import type { CollectionAuditReport } from "@/lib/ops/allstar/collection-audit";
import { displayCanonicalFile } from "@/lib/ops/allstar/canonical-display";
import type { CollectionHarvestMetrics } from "@/lib/ops/allstar/harvest-metrics";
import type { PreserveQueue } from "@/lib/ops/allstar/preserve-queue";
import { trustLabel, trustTone, type TrustLevel } from "@/lib/ops/allstar/confidence";

type Payload = {
  queue: PreserveQueue | null;
  audit: CollectionAuditReport;
  metrics: CollectionHarvestMetrics;
};

function formatEta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString();
}

function TrustBadge({ level }: { level?: string }) {
  if (!level) return null;
  const trust = level as TrustLevel;
  return (
    <span className={`ops-allstar__trust ops-allstar__trust--${trustTone(trust)}`}>
      {trustLabel(trust)}
    </span>
  );
}

export function AllStarPreservePanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/allstar/preserve", { cache: "no-store" });
      if (!res.ok) throw new Error("Preserve queue unavailable");
      setData((await res.json()) as Payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(interval);
  }, [refresh]);

  async function action(name: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/ops/allstar/preserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Action failed");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <p className="ops-allstar__empty">{error}</p>;
  if (!data) return <p className="ops-allstar__empty">Loading preservation queue…</p>;

  const queue = data.queue;
  const metrics = data.metrics;
  const run = metrics.run;
  const counts = queue?.counts ?? {
    pending: data.audit.totalScans - data.audit.preservedCount,
    processing: 0,
    completed: data.audit.preservedCount,
    failed: 0,
  };
  const status = queue?.status ?? "idle";
  const total = queue?.total ?? data.audit.totalScans;
  const pct = Math.round((counts.completed / Math.max(total, 1)) * 100);

  return (
    <div className="ops-allstar__intel">
      <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
        <div className="ops-allstar__archive-panel-head">
          <h2>Batch Run Dashboard</h2>
          <span className={`ops-allstar__live-pill ops-allstar__live-pill--${status === "running" ? "live" : status === "paused" ? "warn" : "pending"}`}>
            {status}
          </span>
        </div>
        <p className="ops-allstar__comparison-lead">
          {counts.completed} / {total} preserved ({pct}%) · Master dataset updates after every disc.
        </p>
        <div className="ops-allstar__preserve-actions">
          <button type="button" disabled={busy || status === "running"} onClick={() => void action("start")}>
            Start
          </button>
          <button type="button" disabled={busy || status !== "running"} onClick={() => void action("pause")}>
            Pause
          </button>
          <button type="button" disabled={busy || status !== "paused"} onClick={() => void action("resume")}>
            Resume
          </button>
          <button type="button" disabled={busy} onClick={() => void action("retry-failed")}>
            Retry Failed
          </button>
        </div>
        <div className="ops-allstar__bar-track ops-allstar__bar-track--lg">
          <div className="ops-allstar__bar-fill ops-allstar__bar-fill--archive" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <div className="ops-allstar__research-grid">
        <article className="ops-allstar__research-stat">
          <strong>Discs / min</strong>
          <span>{run.discsPerMinute ?? "—"}</span>
        </article>
        <article className="ops-allstar__research-stat">
          <strong>ETA</strong>
          <span>{run.estimatedMinutesRemaining != null ? `${run.estimatedMinutesRemaining}m` : "—"}</span>
          <small>{formatEta(run.estimatedCompletionAt)}</small>
        </article>
        <article className="ops-allstar__research-stat">
          <strong>Success rate</strong>
          <span>{run.successRate}%</span>
        </article>
        <article className="ops-allstar__research-stat">
          <strong>Avg OCR conf.</strong>
          <span>{run.averageOcrConfidence}</span>
        </article>
        <article className="ops-allstar__research-stat">
          <strong>Avg geometry conf.</strong>
          <span>{run.averageGeometryConfidence}</span>
        </article>
        <article className="ops-allstar__research-stat">
          <strong>Avg archive conf.</strong>
          <span>{run.averageArchiveConfidence}</span>
        </article>
      </div>

      <div className="ops-allstar__archive-grid">
        <section className="ops-allstar__archive-panel">
          <h3>Current Disc</h3>
          {metrics.currentDisc ? (
            <>
              <p><strong>{metrics.currentDisc.player || metrics.currentDisc.discId}</strong></p>
              <p><code>{displayCanonicalFile(metrics.currentDisc)}</code></p>
              <TrustBadge level={metrics.currentDisc.trustLevel} />
            </>
          ) : (
            <p className="ops-allstar__empty">None processing</p>
          )}
        </section>
        <section className="ops-allstar__archive-panel">
          <h3>Next Disc</h3>
          {metrics.nextDisc ? (
            <>
              <p><strong>{metrics.nextDisc.player || metrics.nextDisc.discId}</strong></p>
              <p><code>{displayCanonicalFile(metrics.nextDisc)}</code></p>
            </>
          ) : (
            <p className="ops-allstar__empty">Queue empty</p>
          )}
        </section>
        <section className="ops-allstar__archive-panel">
          <h3>Last Preserved</h3>
          {metrics.lastPreservedDisc ? (
            <>
              <p><strong>{metrics.lastPreservedDisc.player || metrics.lastPreservedDisc.discId}</strong></p>
              <p><code>{displayCanonicalFile(metrics.lastPreservedDisc)}</code></p>
              <p>Confidence {metrics.lastPreservedDisc.archiveConfidence ?? "—"}</p>
              <TrustBadge level={metrics.lastPreservedDisc.trustLevel} />
            </>
          ) : (
            <p className="ops-allstar__empty">None yet</p>
          )}
        </section>
      </div>

      <div className="ops-allstar__research-grid">
        <article className="ops-allstar__research-stat">
          <strong>Pending</strong>
          <span>{counts.pending}</span>
        </article>
        <article className="ops-allstar__research-stat">
          <strong>Processing</strong>
          <span>{counts.processing}</span>
        </article>
        <article className="ops-allstar__research-stat">
          <strong>Completed</strong>
          <span>{counts.completed}</span>
        </article>
        <article className="ops-allstar__research-stat">
          <strong>Failed</strong>
          <span>{counts.failed}</span>
        </article>
      </div>

      {queue?.items.some((i) => i.state === "failed") ? (
        <section className="ops-allstar__archive-panel">
          <h3>Failed Discs</h3>
          <ul className="ops-allstar__findings">
            {queue.items
              .filter((i) => i.state === "failed")
              .map((item) => (
                <li key={item.discId}>
                  <strong>{item.scanFilename}</strong>
                  <span>{item.error ?? "Unknown error"}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {metrics.reportsReady ? (
        <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
          <h3>Completion Reports Ready</h3>
          <p className="ops-allstar__comparison-lead">
            Preservation, Hall of Fame, Accuracy, and Cadaco Formula Starter reports generated.
          </p>
        </section>
      ) : null}
    </div>
  );
}
