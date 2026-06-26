"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { IntelligenceRunProgress } from "@/lib/ops/intelligence/run-progress-types";

function formatEta(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatRuntime(ms: number | null): string {
  if (ms == null) return "—";
  if (ms >= 3_600_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${Math.round(ms / 1000)}s`;
}

type Props = {
  initialProgress?: IntelligenceRunProgress;
  title?: string;
  idleCommand?: string;
  apiPath?: string;
  recentLimit?: number;
};

export function IntelligenceRunLivePanel({
  initialProgress,
  title = "Overnight Research Build",
  idleCommand = "npm run intelligence:overnight-build",
  apiPath = "/api/ops/intelligence/runs/current/progress",
  recentLimit = 25,
}: Props) {
  const [progress, setProgress] = useState<IntelligenceRunProgress | null>(
    initialProgress ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [nowLabel, setNowLabel] = useState<string>("");

  useEffect(() => {
    function tickClock() {
      if (progress?.startedAt) {
        setElapsedMs(Date.now() - new Date(progress.startedAt).getTime());
      } else {
        setElapsedMs(null);
      }
      if (progress?.updatedAt) {
        setNowLabel(new Date(progress.updatedAt).toLocaleTimeString());
      }
    }
    tickClock();
    const clockId = setInterval(tickClock, 1000);
    return () => clearInterval(clockId);
  }, [progress?.startedAt, progress?.updatedAt]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(apiPath, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled) setError(`HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as { ok: boolean; progress: IntelligenceRunProgress };
        if (!cancelled && data.ok) {
          setProgress(data.progress);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("poll_failed");
      }
    }

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [apiPath]);

  if (progress === null) {
    return (
      <section className="intel-backfill__live intel-backfill__live--idle" aria-busy="true">
        <h2 className="intel-backfill__section-title">{title} · Live</h2>
        <p className="intel-backfill__actions-lead">Loading progress…</p>
      </section>
    );
  }

  if (progress.status === "idle") {
    return (
      <section className="intel-backfill__live intel-backfill__live--idle">
        <h2 className="intel-backfill__section-title">{title}</h2>
        <p className="intel-backfill__actions-lead">
          No run in progress. Start with <code>{idleCommand}</code>
        </p>
        {error && <p className="intel-backfill__live-error">Update error: {error}</p>}
      </section>
    );
  }

  const pct =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const isRunning = progress.status === "running";

  return (
    <section className="intel-backfill__live" aria-live="polite">
      <div className="intel-backfill__live-header">
        <h2 className="intel-backfill__section-title">{title} · Live</h2>
        <span
          className={`intel-backfill__live-badge${isRunning ? " intel-backfill__live-badge--run" : ""}`}
        >
          {isRunning ? "Running" : "Complete"}
        </span>
      </div>

      <p className="intel-backfill__live-sub">
        Top {progress.cohortLimit} VIDEO · play count DESC · RVTR + cover required
      </p>

      <div className="intel-backfill__progress-track" aria-hidden="true">
        <div className="intel-backfill__progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="intel-backfill__progress-label">
        {progress.completed} / {progress.total} ({pct}%)
      </p>

      <div className="intel-backfill__live-grid">
        <div>
          <p className="intel-backfill__live-k">Current song</p>
          <p className="intel-backfill__live-v">
            {progress.currentSong
              ? `${progress.currentSong.title} — ${progress.currentSong.artist}`
              : isRunning
                ? "Starting…"
                : "—"}
          </p>
          {progress.currentSong && (
            <p className="intel-backfill__live-sub">
              {progress.currentSong.rvtr} · {progress.currentSong.playCount} plays · #
              {progress.currentSong.index}/{progress.total}
            </p>
          )}
        </div>
        <div>
          <p className="intel-backfill__live-k">Remaining</p>
          <p className="intel-backfill__live-v">{progress.remaining}</p>
        </div>
        <div>
          <p className="intel-backfill__live-k">Successes</p>
          <p className="intel-backfill__live-v">{progress.successes}</p>
        </div>
        <div>
          <p className="intel-backfill__live-k">Failures</p>
          <p className="intel-backfill__live-v">{progress.failures}</p>
        </div>
        <div>
          <p className="intel-backfill__live-k">Runtime</p>
          <p className="intel-backfill__live-v" suppressHydrationWarning>
            {formatRuntime(elapsedMs)}
          </p>
        </div>
        <div>
          <p className="intel-backfill__live-k">Avg / song</p>
          <p className="intel-backfill__live-v">{formatRuntime(progress.avgRuntimeMs)}</p>
        </div>
        <div>
          <p className="intel-backfill__live-k">ETA</p>
          <p className="intel-backfill__live-v" suppressHydrationWarning>
            {formatEta(progress.eta)}
          </p>
        </div>
      </div>

      {error && <p className="intel-backfill__live-error">Update error: {error}</p>}

      {progress.recentCompleted.length > 0 && (
        <>
          <h3 className="intel-backfill__live-subtitle">
            Last {Math.min(recentLimit, progress.recentCompleted.length)} completed
          </h3>
          <ul className="intel-backfill__list">
            {progress.recentCompleted.slice(0, recentLimit).map((song) => (
              <li key={`${song.rvtr}-${song.completedAt}`} className="intel-backfill__list-item">
                <div className="intel-backfill__list-row">
                  <Link
                    href={`/ops/intelligence/package/${song.rvtr}`}
                    className="intel-backfill__list-link"
                  >
                    <span className="intel-backfill__list-title">{song.title}</span>
                    <span className="intel-backfill__list-artist">{song.artist}</span>
                  </Link>
                  <span
                    className={
                      song.status === "completed"
                        ? "intel-backfill__status--ok"
                        : "intel-backfill__status--miss"
                    }
                  >
                    {song.status === "completed" ? "✓" : "✗"}
                  </span>
                </div>
                <p className="intel-backfill__list-meta">
                  {formatRuntime(song.runtimeMs)} · {song.confidence}% conf · {song.facts} facts ·{" "}
                  {song.stories} stories · artifacts {song.artifactsReady ? "ok" : "partial"}
                  {song.error ? ` · ${song.error}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="intel-backfill__live-updated" suppressHydrationWarning>
        {nowLabel ? `Updated ${nowLabel}` : "Updating…"} · refreshes every 3s
      </p>
    </section>
  );
}
