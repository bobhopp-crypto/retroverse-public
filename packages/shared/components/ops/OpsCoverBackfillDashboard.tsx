"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { BackfillMetrics, BackfillState } from "@/lib/covers/backfill/types";

type StatusResponse = {
  ok?: boolean;
  state?: BackfillState;
  metrics?: BackfillMetrics;
  error?: string;
};

function formatEta(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(ms / 60_000)}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function OpsCoverBackfillDashboard() {
  const [state, setState] = useState<BackfillState | null>(null);
  const [metrics, setMetrics] = useState<BackfillMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/ops/covers/backfill/status");
    const data = (await res.json()) as StatusResponse;
    if (!res.ok || !data.ok || !data.state || !data.metrics) {
      throw new Error(data.error ?? "Status load failed");
    }
    setState(data.state);
    setMetrics(data.metrics);
  }, []);

  useEffect(() => {
    void refresh().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    const id = setInterval(() => {
      void refresh().catch(() => {});
    }, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  const control = async (action: "pause" | "resume" | "reset") => {
    setError(null);
    setMsg(null);
    const res = await fetch("/api/ops/covers/backfill/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error ?? "Control failed");
    setMsg(action === "reset" ? "Progress reset." : action === "pause" ? "Paused." : "Resumed.");
    await refresh();
  };

  const runBatch = async () => {
    setRunning(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/ops/covers/backfill/run-batch", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        batch?: {
          success: number;
          failure: number;
          batchId: string;
          fromMain?: number;
          fromRetry?: number;
        };
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Batch failed");
      const b = data.batch;
      setMsg(
        `Batch ${b?.batchId ?? "?"} — ${b?.success ?? 0} ok, ${b?.failure ?? 0} deferred (main ${b?.fromMain ?? 0}).`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  if (error && !state) {
    return <p className="ops-cover-train__error">{error}</p>;
  }

  return (
    <>
      <header className="ops-cover-train__mission">
        <p className="ops-cover-train__mission-kicker">COVER ACQUISITION · BACKFILL</p>
        <h1 className="ops-cover-train__mission-title">Safe dossier backfill</h1>
        <p className="ops-cover-train__mission-progress">
          Main queue advances · failures deferred to retry · direct-RVAL iTunes
        </p>
        <Link className="ops-cover-train__back" href="/ops">
          ← Back to Ops
        </Link>
      </header>

      <div className="ops-cover-backfill__grid">
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">Albums remaining</span>
          <strong className="ops-cover-backfill__value">{metrics?.coversRemaining ?? "—"}</strong>
        </div>
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">Main queue cursor</span>
          <strong className="ops-cover-backfill__value">
            {metrics?.mainQueuePosition ?? 0} / {state?.totalQueued ?? "—"}
          </strong>
        </div>
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">Success rate</span>
          <strong className="ops-cover-backfill__value">{metrics?.uniqueSuccessRate ?? 0}%</strong>
        </div>
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">Unique processed</span>
          <strong className="ops-cover-backfill__value">{metrics?.uniqueAlbumsProcessed ?? 0}</strong>
        </div>
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">Unique successes</span>
          <strong className="ops-cover-backfill__value">{metrics?.uniqueSuccesses ?? 0}</strong>
        </div>
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">Unique failures</span>
          <strong className="ops-cover-backfill__value">{metrics?.uniqueFailures ?? 0}</strong>
        </div>
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">Retry queue size</span>
          <strong className="ops-cover-backfill__value">{metrics?.retryQueueSize ?? 0}</strong>
        </div>
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">Covers acquired today</span>
          <strong className="ops-cover-backfill__value">{metrics?.coversAcquiredToday ?? 0}</strong>
        </div>
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">Average covers / hour</span>
          <strong className="ops-cover-backfill__value">{metrics?.averagePerHour ?? 0}</strong>
        </div>
        <div className="ops-cover-backfill__stat">
          <span className="ops-cover-backfill__label">ETA</span>
          <strong className="ops-cover-backfill__value">{formatEta(metrics?.etaMs ?? null)}</strong>
        </div>
        <div className="ops-cover-backfill__stat ops-cover-backfill__stat--muted">
          <span className="ops-cover-backfill__label">Batch rate (legacy)</span>
          <strong className="ops-cover-backfill__value">{metrics?.successRate ?? 0}%</strong>
        </div>
      </div>

      {metrics?.topFailureReasons && metrics.topFailureReasons.length > 0 ? (
        <section className="ops-cover-backfill__projection">
          <h2 className="ops-cover-backfill__projection-title">Top failure reasons</h2>
          <ul className="ops-cover-backfill__reasons">
            {metrics.topFailureReasons.map((r) => (
              <li key={r.reason}>
                <strong>{r.count}</strong> {r.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ops-cover-backfill__projection">
        <h2 className="ops-cover-backfill__projection-title">Coverage projection</h2>
        <p className="ops-cover-backfill__projection-note">
          If {metrics?.uniqueSuccessRate ?? 0}% unique success holds across{" "}
          {metrics?.coversRemaining ?? 0} remaining:
        </p>
        <div className="ops-cover-backfill__grid ops-cover-backfill__grid--compact">
          <div className="ops-cover-backfill__stat">
            <span className="ops-cover-backfill__label">Currently covered</span>
            <strong className="ops-cover-backfill__value">{metrics?.currentlyCovered ?? "—"}</strong>
          </div>
          <div className="ops-cover-backfill__stat">
            <span className="ops-cover-backfill__label">Projected additional</span>
            <strong className="ops-cover-backfill__value">
              +{metrics?.projectedAdditionalCovers ?? 0}
            </strong>
          </div>
          <div className="ops-cover-backfill__stat">
            <span className="ops-cover-backfill__label">Projected total</span>
            <strong className="ops-cover-backfill__value">{metrics?.projectedTotalCovered ?? "—"}</strong>
          </div>
          <div className="ops-cover-backfill__stat">
            <span className="ops-cover-backfill__label">Projected coverage</span>
            <strong className="ops-cover-backfill__value">{metrics?.projectedCoveragePct ?? 0}%</strong>
          </div>
        </div>
      </section>

      <div className="ops-cover-backfill__actions">
        <button
          type="button"
          className="ops-cover-review__generate"
          disabled={running || state?.paused}
          onClick={() => void runBatch()}
        >
          {running ? "Running batch…" : "Run next safe batch (100)"}
        </button>
        <button
          type="button"
          className="ops-cover-review__retrain"
          disabled={state?.paused}
          onClick={() => void control("pause").catch((e) => setError(String(e)))}
        >
          Pause
        </button>
        <button
          type="button"
          className="ops-cover-review__retrain"
          onClick={() => void control("resume").catch((e) => setError(String(e)))}
        >
          Resume
        </button>
        <button
          type="button"
          className="ops-cover-review__retrain"
          onClick={() => void control("reset").catch((e) => setError(String(e)))}
        >
          Reset progress
        </button>
      </div>

      <p className="ops-cover-review__loop-hint">
        Safe run:{" "}
        <code>RETROVERSE_PG_SSL=0 npm run cover:backfill:safe -- --limit 2000</code>
        <br />
        Overnight: <code>RETROVERSE_PG_SSL=0 npm run cover:backfill</code>
      </p>

      {msg ? <p className="ops-cover-review__retrain-ok">{msg}</p> : null}
      {error ? <p className="ops-cover-train__error">{error}</p> : null}
      {state?.lastError ? (
        <p className="ops-cover-train__error">Last batch error: {state.lastError}</p>
      ) : null}
    </>
  );
}
