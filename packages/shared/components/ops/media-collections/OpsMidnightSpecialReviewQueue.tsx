"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildClipReviewHrefFromRecord } from "@/lib/ops/media-collections/midnight-special/clip-mode";
import type {
  MsPerformanceRecord,
  PerformanceConfidence,
} from "@/lib/ops/media-collections/midnight-special/types";

type ClassifiedPerformance = MsPerformanceRecord & {
  bucket:
    | "MUSIC"
    | "COMEDY"
    | "INTRO_SEGMENT"
    | "INTERVIEW"
    | "MOVIE_CLIP"
    | "COMMERCIAL"
    | "UNKNOWN";
};

type ReviewFilter =
  | "ALL"
  | "MUSIC"
  | "COMEDY"
  | "INTROS"
  | "MOVIE_CLIPS"
  | "UNKNOWN";

function filterByBucket(items: ClassifiedPerformance[], filter: ReviewFilter): ClassifiedPerformance[] {
  if (filter === "ALL") return items;
  if (filter === "MUSIC") return items.filter((i) => i.bucket === "MUSIC");
  if (filter === "COMEDY") return items.filter((i) => i.bucket === "COMEDY");
  if (filter === "INTROS") {
    return items.filter((i) => i.bucket === "INTRO_SEGMENT" || i.bucket === "INTERVIEW");
  }
  if (filter === "MOVIE_CLIPS") return items.filter((i) => i.bucket === "MOVIE_CLIP");
  return items.filter((i) => i.bucket === "UNKNOWN" || i.bucket === "COMMERCIAL");
}

function confidenceLabel(c: PerformanceConfidence): string {
  return c.toUpperCase();
}

function clipBounds(perf: MsPerformanceRecord): { start: number; end: number } {
  return {
    start: perf.adjusted_start ?? perf.start_seconds,
    end: perf.adjusted_end ?? perf.end_seconds,
  };
}

function clipDurationSec(perf: MsPerformanceRecord): number {
  const b = clipBounds(perf);
  return Math.max(1, b.end - b.start);
}

type QueuePayload = {
  ok: boolean;
  performances?: ClassifiedPerformance[];
  summary?: {
    music: number;
    comedy_skits: number;
    intros_interstitials: number;
    movie_clips: number;
    unknown: number;
  };
  stats?: {
    queue_total: number;
    remaining_music_reviews: number;
    accepted_performances: number;
    rejected_segments: number;
    estimated_export_count: number;
  };
  error?: string;
};

type BulkAction = "accept_exact_music" | "reject_comedy" | "reject_movie_clips" | "reject_intros";

const FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: "MUSIC", label: "Music" },
  { id: "ALL", label: "All" },
  { id: "COMEDY", label: "Comedy" },
  { id: "INTROS", label: "Intros" },
  { id: "MOVIE_CLIPS", label: "Movie clips" },
  { id: "UNKNOWN", label: "Unknown" },
];

const BULK_ACTIONS: { id: BulkAction; label: string; confirm: string }[] = [
  {
    id: "accept_exact_music",
    label: "Accept All Exact Music",
    confirm: "Accept all EXACT music candidates in the review queue?",
  },
  {
    id: "reject_comedy",
    label: "Reject All Comedy",
    confirm: "Reject all comedy/sketch candidates in the review queue?",
  },
  {
    id: "reject_movie_clips",
    label: "Reject All Movie Clips",
    confirm: "Reject all movie clip candidates in the review queue?",
  },
  {
    id: "reject_intros",
    label: "Reject All Intros",
    confirm: "Reject all intro/interview interstitial candidates in the review queue?",
  },
];

function confidenceTone(c: PerformanceConfidence): string {
  if (c === "exact") return "ok";
  if (c === "high") return "info";
  if (c === "medium") return "warn";
  return "bad";
}

export default function OpsMidnightSpecialReviewQueue() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<ReviewFilter>("MUSIC");
  const [queue, setQueue] = useState<QueuePayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingBulk, setPendingBulk] = useState<BulkAction | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clipProgress, setClipProgress] = useState(0);
  const [clipNowSec, setClipNowSec] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopAtEndRef = useRef<(() => void) | null>(null);
  const autoplayPendingRef = useRef(false);

  const items = useMemo(
    () => filterByBucket(queue?.performances ?? [], filter),
    [queue, filter],
  );

  const selected = useMemo(
    () => items.find((p) => p.performance_id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  const selectedIndex = useMemo(
    () => (selected ? items.findIndex((p) => p.performance_id === selected.performance_id) : -1),
    [items, selected],
  );

  const loadQueue = useCallback(async (): Promise<QueuePayload | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/ops/media-collections/midnight-special/performances/queue?status=review",
        { cache: "no-store" },
      );
      const data = (await res.json()) as QueuePayload;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "queue_failed");
        return null;
      }
      setQueue(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "queue_failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearClipStopListener = useCallback(() => {
    const v = videoRef.current;
    const stopAt = stopAtEndRef.current;
    if (v && stopAt) v.removeEventListener("timeupdate", stopAt);
    stopAtEndRef.current = null;
  }, []);

  const updateClipProgress = useCallback((perf: MsPerformanceRecord) => {
    const v = videoRef.current;
    if (!v) return;
    const b = clipBounds(perf);
    const rel = Math.max(0, v.currentTime - b.start);
    const dur = clipDurationSec(perf);
    setClipNowSec(rel);
    setClipProgress(Math.min(100, (rel / dur) * 100));
  }, []);

  const previewClip = useCallback(
    (perf: MsPerformanceRecord, autoplay = true) => {
      const v = videoRef.current;
      if (!v) return;

      clearClipStopListener();

      const startPlayback = () => {
        const b = clipBounds(perf);
        v.currentTime = b.start;
        setClipNowSec(0);
        setClipProgress(0);
        updateClipProgress(perf);

        if (!autoplay) return;

        void v.play().catch(() => undefined);

        const stopAt = () => {
          updateClipProgress(perf);
          if (v.currentTime >= b.end - 0.2) {
            v.pause();
            setIsPlaying(false);
            v.removeEventListener("timeupdate", stopAt);
            stopAtEndRef.current = null;
          }
        };
        stopAtEndRef.current = stopAt;
        v.addEventListener("timeupdate", stopAt);
      };

      if (v.readyState >= 1) startPlayback();
      else {
        const onReady = () => {
          v.removeEventListener("loadedmetadata", onReady);
          startPlayback();
        };
        v.addEventListener("loadedmetadata", onReady);
      }
    },
    [clearClipStopListener, updateClipProgress],
  );

  const seekToClip = useCallback(
    (perf: MsPerformanceRecord, autoplay = false) => {
      const v = videoRef.current;
      if (!v) return;
      clearClipStopListener();
      v.pause();
      setIsPlaying(false);
      const b = clipBounds(perf);
      v.currentTime = b.start;
      setClipNowSec(0);
      setClipProgress(0);
      if (autoplay) previewClip(perf, true);
    },
    [clearClipStopListener, previewClip],
  );

  const seekRelative = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v || !selected) return;
      const b = clipBounds(selected);
      const next = Math.max(b.start, Math.min(b.end, v.currentTime + delta));
      v.currentTime = next;
      updateClipProgress(selected);
    },
    [selected, updateClipProgress],
  );

  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v || !selected) return;
    if (v.paused) {
      const b = clipBounds(selected);
      if (v.currentTime < b.start || v.currentTime >= b.end) {
        previewClip(selected, true);
      } else {
        void v.play().catch(() => undefined);
      }
    } else {
      v.pause();
    }
  }, [previewClip, selected]);

  const advanceToNext = useCallback(
    (data: QueuePayload | null, fromIndex: number) => {
      const nextItems = filterByBucket(data?.performances ?? [], filter);
      const next =
        nextItems[fromIndex] ??
        nextItems[fromIndex > 0 ? fromIndex - 1 : 0] ??
        null;
      if (next) {
        autoplayPendingRef.current = true;
        setSelectedId(next.performance_id);
      } else {
        setSelectedId(null);
      }
    },
    [filter],
  );

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (items.length && !items.some((i) => i.performance_id === selectedId)) {
      setSelectedId(items[0]?.performance_id ?? null);
    }
  }, [items, selectedId]);

  useEffect(() => {
    if (!selected) return;
    if (autoplayPendingRef.current) {
      autoplayPendingRef.current = false;
      previewClip(selected, true);
      return;
    }
    seekToClip(selected, false);
  }, [selected?.performance_id, selected?.episode_id, previewClip, seekToClip, selected]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      if (selected) updateClipProgress(selected);
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      clearClipStopListener();
    };
  }, [selected, updateClipProgress, clearClipStopListener]);

  async function reviewAction(
    action: "accept" | "reject" | "adjust",
    perf: MsPerformanceRecord,
    opts?: { advance?: boolean },
  ) {
    const idx = items.findIndex((p) => p.performance_id === perf.performance_id);
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/media-collections/midnight-special/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: perf.episode_id,
          performance_id: perf.performance_id,
          action,
          start_sec: action === "adjust" ? Math.max(0, perf.start_seconds - 2) : undefined,
          end_sec: action === "adjust" ? perf.end_seconds + 2 : undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (!res.ok || !data.ok) {
        setError("review_failed");
        return;
      }
      setNotice(`${action} → ${perf.artist} — ${perf.song || perf.source_chapter}`);
      const refreshed = await loadQueue();
      if ((action === "accept" || action === "reject") && opts?.advance !== false) {
        advanceToNext(refreshed, idx);
      }
    } finally {
      setBusy(false);
    }
  }

  async function runBulk(action: BulkAction) {
    setBusy(true);
    setNotice(null);
    setPendingBulk(null);
    try {
      const res = await fetch("/api/ops/media-collections/midnight-special/review/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirm: true }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        result?: { updated: number };
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "bulk_failed");
        return;
      }
      setNotice(`Bulk ${action}: updated ${data.result?.updated ?? 0} items.`);
      await loadQueue();
    } finally {
      setBusy(false);
    }
  }

  function formatClipOffset(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  if (loading && !queue) {
    return <p className="ops-dim">Loading review queue…</p>;
  }

  const summary = queue?.summary;
  const stats = queue?.stats;

  return (
    <section className="ms-review-queue ms-review-queue--workstation">
      <div className="ms-review-queue__shell-header">
        <div className="ms-review-queue__header">
          <h2 className="mc-card__title">Review Queue</h2>
          <div className="ms-review-queue__summary">
            <span>
              Music: <strong>{summary?.music ?? 0}</strong>
            </span>
            <span>
              Comedy/skits: <strong>{summary?.comedy_skits ?? 0}</strong>
            </span>
            <span>
              Intros/interstitials: <strong>{summary?.intros_interstitials ?? 0}</strong>
            </span>
            <span>
              Movie clips: <strong>{summary?.movie_clips ?? 0}</strong>
            </span>
            <span>
              Unknown: <strong>{summary?.unknown ?? 0}</strong>
            </span>
          </div>
          <div className="ms-review-queue__stats">
            <span>
              Remaining music: <strong>{stats?.remaining_music_reviews ?? 0}</strong>
            </span>
            <span>
              Accepted: <strong>{stats?.accepted_performances ?? 0}</strong>
            </span>
            <span>
              Rejected: <strong>{stats?.rejected_segments ?? 0}</strong>
            </span>
            <span>
              Est. export: <strong>{stats?.estimated_export_count ?? 0}</strong>
            </span>
          </div>
        </div>

        <div className="ms-review-queue__filters mc-actions">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ops-btn ${filter === f.id ? "ops-btn--warn" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id === "MUSIC" && summary ? ` (${summary.music})` : ""}
            </button>
          ))}
        </div>

        <div className="ms-review-queue__bulk mc-actions">
          {BULK_ACTIONS.map((b) => (
            <button
              key={b.id}
              type="button"
              className="ops-btn ops-btn--info"
              disabled={busy}
              onClick={() => setPendingBulk(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>

        {pendingBulk ? (
          <div className="ms-review-queue__confirm mc-notice mc-notice--warn">
            {BULK_ACTIONS.find((b) => b.id === pendingBulk)?.confirm}{" "}
            <button
              type="button"
              className="ops-btn ops-btn--warn"
              disabled={busy}
              onClick={() => void runBulk(pendingBulk)}
            >
              Confirm
            </button>{" "}
            <button type="button" className="ops-btn" onClick={() => setPendingBulk(null)}>
              Cancel
            </button>
          </div>
        ) : null}

        {notice ? <p className="mc-notice">{notice}</p> : null}
        {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}
      </div>

      <div className="ms-review-queue__workstation">
        <div className="ms-review-queue__stage-column">
      {selected ? (
        <div className="ms-review-queue__stage">
          <div className="ms-review-queue__now-playing">
            <div>
              <h3 className="ms-review-queue__stage-title">
                {selected.artist}
                {selected.song ? ` — ${selected.song}` : ""}
              </h3>
              <p className="ops-dim">
                {selected.episode_title} · {selected.air_date ?? "—"} ·{" "}
                <code>{selected.episode_id}</code>
              </p>
            </div>
            <div className="ms-review-queue__badges">
              <span className={`ops-pill ops-pill--${confidenceTone(selected.confidence)}`}>
                {confidenceLabel(selected.confidence)}
              </span>
              <span className="ops-pill ops-pill--info">{selected.bucket}</span>
              <span className="ops-dim">
                {selectedIndex + 1} / {items.length}
              </span>
            </div>
          </div>

          <div className="ms-review-queue__timestamps">
            <span>
              Clip start <strong>{selected.start_timecode}</strong>
            </span>
            <span>
              Clip end <strong>{selected.end_timecode}</strong>
            </span>
            <span>
              Duration <strong>{Math.round(clipDurationSec(selected))}s</strong>
            </span>
            <span>
              Clip position <strong>{formatClipOffset(clipNowSec)}</strong>
            </span>
          </div>

          <div className="ms-review-queue__video-wrap">
            <video
              ref={videoRef}
              key={selected.episode_id}
              className="ms-review-queue__video"
              playsInline
              preload="metadata"
              src={`/api/ops/media-collections/midnight-special/video?episode=${encodeURIComponent(selected.episode_id)}`}
            />
          </div>

          <div className="ms-review-queue__clip-progress" aria-hidden>
            <div
              className="ms-review-queue__clip-progress-bar"
              style={{ width: `${clipProgress}%` }}
            />
          </div>

          <div className="ms-review-queue__transport mc-actions">
            <button type="button" className="ops-btn" disabled={busy} onClick={() => seekRelative(-10)}>
              −10s
            </button>
            <button type="button" className="ops-btn" disabled={busy} onClick={() => seekRelative(-2)}>
              −2s
            </button>
            <button type="button" className="ops-btn ops-btn--warn" disabled={busy} onClick={togglePlayPause}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button type="button" className="ops-btn" disabled={busy} onClick={() => seekRelative(2)}>
              +2s
            </button>
            <button type="button" className="ops-btn" disabled={busy} onClick={() => seekRelative(10)}>
              +10s
            </button>
          </div>

          <div className="ms-review-queue__primary-actions mc-actions">
            <button
              type="button"
              className="ops-btn ops-btn--info"
              disabled={busy}
              onClick={() => previewClip(selected, true)}
            >
              Preview
            </button>
            <button
              type="button"
              className="ops-btn"
              disabled={busy}
              onClick={() => void reviewAction("accept", selected)}
            >
              Accept
            </button>
            <button
              type="button"
              className="ops-btn"
              disabled={busy}
              onClick={() => void reviewAction("adjust", selected, { advance: false })}
            >
              Adjust ±2s
            </button>
            <a
              className="ops-btn ops-btn--info"
              href={buildClipReviewHrefFromRecord(selected)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Media Lab
            </a>
            <button
              type="button"
              className="ops-btn"
              disabled={busy}
              onClick={() => void reviewAction("reject", selected)}
            >
              Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="ms-review-queue__stage">
          <p className="ops-dim">Select a candidate from the list.</p>
        </div>
      )}
        </div>

        <div className="ms-review-queue__list-column">
          <div className="ms-review-queue__list-header">
            Candidates ({items.length})
          </div>
          <div className="ms-review-queue__cards">
            {items.length === 0 ? (
              <p className="ops-dim">
                No items in <strong>{filter}</strong> filter. Try another bucket or run bulk actions.
              </p>
            ) : (
              items.map((perf) => (
                <article
                  key={perf.performance_id}
                  className={`ms-review-card ${perf.performance_id === selected?.performance_id ? "ms-review-card--active" : ""}`}
                  onClick={() => setSelectedId(perf.performance_id)}
                >
                  <div className="ms-review-card__top">
                    <div>
                      <h3 className="ms-review-card__title">
                        {perf.artist}
                        {perf.song ? ` — ${perf.song}` : ""}
                      </h3>
                      <p className="ms-review-card__meta ops-dim">
                        {perf.start_timecode} → {perf.end_timecode} · {perf.episode_title}
                      </p>
                    </div>
                    <span className={`ops-pill ops-pill--${confidenceTone(perf.confidence)}`}>
                      {confidenceLabel(perf.confidence)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
