"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatInOutTimecode } from "@/lib/ops/media-collections/midnight-special/effective-bounds";
import type { PerformanceEditorContext } from "@/lib/ops/media-lab/performance-editor/context";
import type { PerformanceStatus } from "@/lib/ops/media-collections/midnight-special/types";

import type { ChapterThumbSet } from "./ChapterThumbTriplet";
import { ClipSelectionPanel, type ClipSelectionState } from "./ClipSelectionPanel";
import { HarvestLibraryPanel } from "./HarvestLibraryPanel";
import { PerformanceFilmstrip } from "./PerformanceFilmstrip";

const PAD_SEC = 90;
const FRAME_STEP = 1 / 30;

type Props = {
  episodeId: string;
  performanceId: string;
  onSelectSibling?: (episodeId: string, performanceId: string) => void;
};

function statusLabel(status: PerformanceStatus): string {
  return status.replace(/_/g, " ");
}

export function MediaLabPerformanceEditor({
  episodeId,
  performanceId,
  onSelectSibling,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [context, setContext] = useState<PerformanceEditorContext | null>(null);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selection, setSelection] = useState<ClipSelectionState>({});
  const [playheadSec, setPlayheadSec] = useState(0);
  const [episodeDuration, setEpisodeDuration] = useState(7200);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbs, setThumbs] = useState<ChapterThumbSet | null>(null);
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const stopAtRef = useRef<number | null>(null);

  const loadEditor = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ episode: episodeId, performance: performanceId });
      const res = await fetch(`/api/ops/media-lab/performance/editor?${params}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok: boolean;
        context?: PerformanceEditorContext;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.context) {
        setError(data.error ?? "load_failed");
        return;
      }
      const ctx = data.context;
      setContext(ctx);
      setArtist(ctx.artist);
      setTitle(ctx.title);
      setNotes(ctx.review_notes ?? "");
      setSelection({
        inSeconds: ctx.effective_start,
        outSeconds: ctx.effective_end,
      });
      setPlayheadSec(ctx.effective_start);
      setEpisodeDuration(ctx.episode_duration_sec);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [episodeId, performanceId]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);

  const inSec = selection.inSeconds ?? context?.effective_start ?? 0;
  const outSec = selection.outSeconds ?? context?.effective_end ?? inSec + 1;
  const panelStart = Math.max(0, inSec - PAD_SEC);
  const panelEnd = Math.min(episodeDuration, outSec + PAD_SEC);
  const filmstripStart = Math.max(0, inSec - PAD_SEC);
  const filmstripEnd = Math.min(episodeDuration, outSec + PAD_SEC);

  const seek = useCallback(
    (sec: number) => {
      const video = videoRef.current;
      if (!video) return;
      const clamped = Math.max(0, Math.min(episodeDuration, sec));
      video.currentTime = clamped;
      setPlayheadSec(clamped);
    },
    [episodeDuration],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !context || loading) return;

    const onLoaded = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setEpisodeDuration(video.duration);
      }
      video.currentTime = context.effective_start;
      setPlayheadSec(context.effective_start);
    };
    const onTimeUpdate = () => {
      setPlayheadSec(video.currentTime);
      if (stopAtRef.current != null && video.currentTime >= stopAtRef.current) {
        video.pause();
        stopAtRef.current = null;
        setIsPlaying(false);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    if (video.readyState >= 1) onLoaded();

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [context, loading]);

  useEffect(() => {
    if (!context) return;
    let cancelled = false;
    setThumbsLoading(true);
    setThumbs(null);

    const params = new URLSearchParams({
      episode: context.episode_id,
      performance: context.performance_id,
      startSec: String(panelStart),
      endSec: String(panelEnd),
    });

    void fetch(`/api/ops/media-lab/performance/thumbnails?${params}`)
      .then(async (res) => {
        const data = (await res.json()) as ChapterThumbSet & { ok?: boolean; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.ok) throw new Error(data.error ?? "thumbs_failed");
        setThumbs({
          chapterId: context.performance_id,
          first: data.first,
          mid: data.mid,
          last: data.last,
        });
      })
      .catch(() => {
        if (!cancelled) setThumbs(null);
      })
      .finally(() => {
        if (!cancelled) setThumbsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [context, panelEnd, panelStart]);

  const queueItems = useMemo(
    () =>
      (context?.siblings ?? []).filter(
        (s) => s.status === "accepted" || s.status === "exported",
      ),
    [context?.siblings],
  );

  const siblingIndex = context?.sibling_index ?? 0;
  const siblingTotal = context?.siblings.length ?? 0;
  const canPrev = siblingIndex > 0;
  const canNext = siblingIndex < siblingTotal - 1;

  function goSibling(delta: -1 | 1) {
    if (!context) return;
    const next = context.siblings[siblingIndex + delta];
    if (!next) return;
    onSelectSibling?.(context.episode_id, next.performance_id);
  }

  function nudge(delta: number) {
    seek(playheadSec + delta);
  }

  function frameStep(direction: -1 | 1) {
    seek(playheadSec + direction * FRAME_STEP);
  }

  function setInHere() {
    setSelection((prev) => ({
      ...prev,
      inSeconds: Math.min(playheadSec, (prev.outSeconds ?? outSec) - 1),
    }));
  }

  function setOutHere() {
    setSelection((prev) => ({
      ...prev,
      outSeconds: Math.max(playheadSec, (prev.inSeconds ?? inSec) + 1),
    }));
  }

  function previewClip() {
    const video = videoRef.current;
    if (!video) return;
    stopAtRef.current = outSec - 0.15;
    seek(inSec);
    void video.play();
  }

  async function saveBounds() {
    if (!context) return;
    setBusy("save");
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/ops/media-collections/midnight-special/clip-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: context.episode_id,
          performance_id: context.performance_id,
          adjusted_start: inSec,
          adjusted_end: outSec,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "save_failed");
        return;
      }
      setNotice("Saved clip boundaries.");
      await loadEditor();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setBusy(null);
    }
  }

  async function reviewAction(action: "accept" | "reject" | "pending") {
    if (!context) return;
    setBusy(action);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/ops/media-collections/midnight-special/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: context.episode_id,
          performance_id: context.performance_id,
          action,
          artist,
          song: title,
          review_notes: notes,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "review_failed");
        return;
      }
      setNotice(action === "accept" ? "Accepted." : action === "reject" ? "Rejected." : "Returned to review.");
      await loadEditor();
    } catch (e) {
      setError(e instanceof Error ? e.message : "review_failed");
    } finally {
      setBusy(null);
    }
  }

  async function exportPerformance() {
    if (!context) return;
    setBusy("export");
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/ops/media-collections/midnight-special/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: context.episode_id,
          performance_id: context.performance_id,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "export_failed");
        return;
      }
      setNotice("Exported to VDJ library.");
      await loadEditor();
    } catch (e) {
      setError(e instanceof Error ? e.message : "export_failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="ops-dim ml-perf-editor__loading">Loading performance editor…</p>;
  }

  if (error && !context) {
    return <p className="mc-notice mc-notice--error">{error}</p>;
  }

  if (!context) return null;

  return (
    <section className="ml-perf-editor ops-ml-deck ops-ml-deck--review">
      <header className="ops-ml-review__topbar ml-perf-editor__topbar">
        <div className="ops-ml-review__brand">
          <span className="ops-ml-review__brand-mark" aria-hidden="true">
            ▶
          </span>
          <span className="ops-ml-review__brand-text">
            RETROVERSE <strong>MEDIA LAB</strong>
          </span>
        </div>
        <h1 className="ops-ml-review__source">{context.episode_title}</h1>
        <div className="ops-ml-review__clip-nav">
          <button
            type="button"
            className="ops-ml-review__nav-arrow"
            disabled={!canPrev}
            aria-label="Previous performance"
            onClick={() => goSibling(-1)}
          >
            ◀
          </button>
          <span className="ops-ml-review__clip-counter">
            PERF {siblingIndex + 1} OF {siblingTotal}
          </span>
          <button
            type="button"
            className="ops-ml-review__nav-arrow"
            disabled={!canNext}
            aria-label="Next performance"
            onClick={() => goSibling(1)}
          >
            ▶
          </button>
        </div>
        <button
          type="button"
          className="ops-ml-review__queue-badge ops-ml-review__queue-badge--harvest"
          aria-expanded={harvestOpen}
          onClick={() => setHarvestOpen((o) => !o)}
        >
          <span className="ops-ml-review__queue-badge-label">HARVEST</span>
        </button>
        <button
          type="button"
          className="ops-ml-review__queue-badge"
          aria-expanded={queueOpen}
          onClick={() => setQueueOpen((o) => !o)}
        >
          <span className="ops-ml-review__queue-badge-label">QUEUE</span>
          <strong className="ops-ml-review__queue-badge-count">{queueItems.length}</strong>
        </button>
      </header>

      <div className="ops-ml-review__body ml-perf-editor__body">
        <div className="ops-ml-review__columns ml-perf-editor__columns">
          <section className="ops-ml-review__center ml-perf-editor__center">
            <div className="ops-ml-deck__video-wrap ops-ml-review__video-wrap">
              <video
                ref={videoRef}
                className="ops-ml-deck__video ops-ml-review__video"
                src={context.video_url}
                controls
                playsInline
                preload="metadata"
              />
            </div>

            <PerformanceFilmstrip
              episodeId={context.episode_id}
              performanceId={context.performance_id}
              startSec={filmstripStart}
              endSec={filmstripEnd}
              playheadSec={playheadSec}
              onSeek={seek}
            />

            <div className="ops-ml-review__trim">
              <ClipSelectionPanel
                clipStartSec={panelStart}
                clipEndSec={panelEnd}
                playheadSec={playheadSec}
                selection={selection}
                thumbs={thumbs}
                thumbsLoading={thumbsLoading}
                onSelectionChange={setSelection}
                onSeek={seek}
              />
            </div>

            <div className="ml-perf-editor__transport mc-actions">
              <button type="button" className="ops-btn" disabled={!!busy} onClick={() => frameStep(-1)}>
                Frame −
              </button>
              <button type="button" className="ops-btn" disabled={!!busy} onClick={() => nudge(-1)}>
                −1s
              </button>
              <button
                type="button"
                className="ops-btn ops-btn--warn"
                disabled={!!busy}
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  if (video.paused) void video.play();
                  else video.pause();
                }}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button type="button" className="ops-btn" disabled={!!busy} onClick={() => nudge(1)}>
                +1s
              </button>
              <button type="button" className="ops-btn" disabled={!!busy} onClick={() => frameStep(1)}>
                Frame +
              </button>
              <button type="button" className="ops-btn ops-btn--info" disabled={!!busy} onClick={setInHere}>
                Set In
              </button>
              <button type="button" className="ops-btn ops-btn--info" disabled={!!busy} onClick={setOutHere}>
                Set Out
              </button>
              <button type="button" className="ops-btn" disabled={!!busy} onClick={previewClip}>
                Preview Clip
              </button>
            </div>
          </section>

          <aside className="ops-ml-review__side ml-perf-editor__side">
            <div className="ml-perf-editor__meta-block">
              <label className="ops-ml-review__field-label" htmlFor="ml-perf-artist">
                Artist
              </label>
              <input
                id="ml-perf-artist"
                className="ops-ml-field__input ops-ml-review__title-input ml-perf-editor__input"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
              />
            </div>

            <div className="ml-perf-editor__meta-block">
              <label className="ops-ml-review__field-label" htmlFor="ml-perf-title">
                Title
              </label>
              <input
                id="ml-perf-title"
                className="ops-ml-field__input ops-ml-review__title-input ml-perf-editor__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <dl className="ml-perf-editor__meta-dl">
              <dt>Collection</dt>
              <dd>Midnight Special</dd>
              <dt>Classification</dt>
              <dd>
                <span className={`ml-perf-editor__bucket ml-perf-editor__bucket--${context.bucket.toLowerCase()}`}>
                  {context.bucket}
                </span>
              </dd>
              <dt>Status</dt>
              <dd>{statusLabel(context.status)}</dd>
              <dt>Confidence</dt>
              <dd>{context.confidence}</dd>
              <dt>In / Out</dt>
              <dd>
                {formatInOutTimecode(inSec)} → {formatInOutTimecode(outSec)} ({Math.round(outSec - inSec)}s)
              </dd>
              <dt>Source chapter</dt>
              <dd className="ml-perf-editor__chapter">{context.source_chapter}</dd>
            </dl>

            <div className="ml-perf-editor__meta-block">
              <label className="ops-ml-review__field-label" htmlFor="ml-perf-notes">
                Notes
              </label>
              <textarea
                id="ml-perf-notes"
                className="ops-ml-field__input ml-perf-editor__notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Review notes…"
              />
            </div>

            <div className="ml-perf-editor__actions">
              <button
                type="button"
                className="ops-btn ops-btn--warn ml-perf-editor__action"
                disabled={!!busy}
                onClick={() => void saveBounds()}
              >
                {busy === "save" ? "Saving…" : "Save Boundaries"}
              </button>
              <button
                type="button"
                className="ops-btn ops-btn--info ml-perf-editor__action"
                disabled={!!busy}
                onClick={() => void reviewAction("accept")}
              >
                {busy === "accept" ? "…" : "Accept"}
              </button>
              <button
                type="button"
                className="ops-btn ml-perf-editor__action"
                disabled={!!busy}
                onClick={() => void reviewAction("reject")}
              >
                {busy === "reject" ? "…" : "Reject"}
              </button>
              <button
                type="button"
                className="ops-btn ml-perf-editor__action"
                disabled={!!busy || context.status !== "accepted"}
                onClick={() => void exportPerformance()}
              >
                {busy === "export" ? "Exporting…" : "Export Clip"}
              </button>
            </div>
          </aside>
        </div>
      </div>

      <nav className="ml-perf-editor__siblings" aria-label="Episode performances">
        {context.siblings.map((s) => (
          <button
            key={s.performance_id}
            type="button"
            className={`ml-perf-editor__sibling${s.performance_id === context.performance_id ? " ml-perf-editor__sibling--active" : ""}`}
            onClick={() => onSelectSibling?.(context.episode_id, s.performance_id)}
          >
            <span className="ml-perf-editor__sibling-title">
              {s.artist || s.title || "—"}
            </span>
            <span className="ml-perf-editor__sibling-meta">
              {s.bucket} · {statusLabel(s.status)}
            </span>
          </button>
        ))}
      </nav>

      {queueOpen || harvestOpen ? (
        <button
          type="button"
          className="ops-ml-review-queue-drawer__backdrop"
          aria-label="Close panel"
          onClick={() => {
            setQueueOpen(false);
            setHarvestOpen(false);
          }}
        />
      ) : null}

      <aside
        className={`ops-ml-harvest-drawer${harvestOpen ? " ops-ml-harvest-drawer--open" : ""}`}
        aria-hidden={!harvestOpen}
      >
        <HarvestLibraryPanel onClose={() => setHarvestOpen(false)} />
      </aside>

      <aside
        className={`ops-ml-review-queue-drawer ml-perf-editor__queue-drawer${
          queueOpen ? " ops-ml-review-queue-drawer--open" : ""
        }`}
        aria-hidden={!queueOpen}
      >
        <header className="ml-perf-editor__queue-header">
          <h3>Export queue</h3>
          <button type="button" className="ops-btn ops-btn--sm" onClick={() => setQueueOpen(false)}>
            Close
          </button>
        </header>
        <ul className="ml-perf-editor__queue-list">
          {queueItems.length === 0 ? (
            <li className="ops-dim">No accepted performances in this episode.</li>
          ) : (
            queueItems.map((item) => (
              <li key={item.performance_id}>
                <button
                  type="button"
                  className="ml-perf-editor__queue-item"
                  onClick={() => {
                    onSelectSibling?.(context.episode_id, item.performance_id);
                    setQueueOpen(false);
                  }}
                >
                  {item.artist} — {item.title || "—"}
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      {notice ? <p className="mc-notice ml-perf-editor__notice">{notice}</p> : null}
      {error ? <p className="mc-notice mc-notice--error ml-perf-editor__notice">{error}</p> : null}
    </section>
  );
}
