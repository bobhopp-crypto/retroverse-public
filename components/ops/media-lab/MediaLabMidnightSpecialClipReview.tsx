"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ClipSelectionPanel, type ClipSelectionState } from "./ClipSelectionPanel";
import { formatInOutTimecode } from "@/lib/ops/media-collections/midnight-special/effective-bounds";
import type { MsClipReviewContext } from "@/lib/ops/media-collections/midnight-special/types";

type Props = {
  episodeId: string;
  performanceId: string;
  returnHref?: string;
};

const FRAME_STEP = 1 / 30;
const PAD_SEC = 90;

export function MediaLabMidnightSpecialClipReview({
  episodeId,
  performanceId,
  returnHref,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState<MsClipReviewContext | null>(null);
  const [episodeDuration, setEpisodeDuration] = useState(7200);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [selection, setSelection] = useState<ClipSelectionState>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const stopAtRef = useRef<number | null>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ episode: episodeId, performance: performanceId });
      if (returnHref) params.set("return", returnHref);
      const res = await fetch(
        `/api/ops/media-collections/midnight-special/clip-review?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        ok: boolean;
        context?: MsClipReviewContext;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.context) {
        setError(data.error ?? "load_failed");
        return;
      }
      setContext(data.context);
      setSelection({
        inSeconds: data.context.effective_start,
        outSeconds: data.context.effective_end,
      });
      setPlayheadSec(data.context.effective_start);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [episodeId, performanceId, returnHref]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const seek = useCallback((sec: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(episodeDuration, sec));
    video.currentTime = clamped;
    setPlayheadSec(clamped);
  }, [episodeDuration]);

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

  const inSec = selection.inSeconds ?? context?.effective_start ?? 0;
  const outSec = selection.outSeconds ?? context?.effective_end ?? inSec + 1;
  const panelStart = Math.max(0, inSec - PAD_SEC);
  const panelEnd = Math.min(episodeDuration, outSec + PAD_SEC);

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

  async function saveAdjustments() {
    if (!context) return;
    setBusy(true);
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
      const data = (await res.json()) as {
        ok: boolean;
        context?: MsClipReviewContext;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.context) {
        setError(data.error ?? "save_failed");
        return;
      }
      setContext(data.context);
      setNotice("Saved clip boundaries to performance manifest.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="ops-dim">Loading clip review…</p>;
  }

  if (error && !context) {
    return <p className="mc-notice mc-notice--error">{error}</p>;
  }

  if (!context) return null;

  const backHref = context.return_href;

  return (
    <section className="ops-ml ops-ml--workstation ops-ml-ms-clip-review">
      <div className="ops-ml-ms-clip-review__header">
        <div>
          <p className="ops-topbar__kicker">Clip Review · Midnight Special</p>
          <h2 className="ops-ml-ms-clip-review__title">
            {context.artist}
            {context.title ? ` — ${context.title}` : ""}
          </h2>
          <p className="ops-dim">
            {context.episode_title} · {context.air_date ?? "—"} · <code>{context.episode_id}</code>
          </p>
        </div>
        <Link className="ops-btn ops-btn--link" href={backHref}>
          ← Back to Review Queue
        </Link>
      </div>

      <div className="ops-ml-ms-clip-review__bounds">
        <span>
          In <strong>{formatInOutTimecode(inSec)}</strong>
        </span>
        <span>
          Out <strong>{formatInOutTimecode(outSec)}</strong>
        </span>
        <span>
          Duration <strong>{Math.round(outSec - inSec)}s</strong>
        </span>
        {context.modified_at ? (
          <span className="ops-dim">
            Last saved {context.modified_at.replace("T", " ").slice(0, 19)}
          </span>
        ) : (
          <span className="ops-dim">Detected bounds (not yet adjusted)</span>
        )}
      </div>

      <div className="ops-ml-ms-clip-review__video-wrap">
        <video
          ref={videoRef}
          className="ops-ml-ms-clip-review__video"
          playsInline
          preload="metadata"
          src={context.video_url}
        />
      </div>

      <ClipSelectionPanel
        clipStartSec={panelStart}
        clipEndSec={panelEnd}
        playheadSec={playheadSec}
        selection={selection}
        thumbs={null}
        thumbsLoading={false}
        onSelectionChange={setSelection}
        onSeek={seek}
      />

      <div className="ops-ml-ms-clip-review__tools mc-actions">
        <button type="button" className="ops-btn" disabled={busy} onClick={() => frameStep(-1)}>
          Frame −
        </button>
        <button type="button" className="ops-btn" disabled={busy} onClick={() => nudge(-2)}>
          −2s
        </button>
        <button type="button" className="ops-btn" disabled={busy} onClick={() => nudge(-1)}>
          −1s
        </button>
        <button
          type="button"
          className="ops-btn ops-btn--warn"
          disabled={busy}
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (video.paused) void video.play();
            else video.pause();
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button" className="ops-btn" disabled={busy} onClick={() => nudge(1)}>
          +1s
        </button>
        <button type="button" className="ops-btn" disabled={busy} onClick={() => nudge(2)}>
          +2s
        </button>
        <button type="button" className="ops-btn" disabled={busy} onClick={() => frameStep(1)}>
          Frame +
        </button>
        <button type="button" className="ops-btn ops-btn--info" disabled={busy} onClick={setInHere}>
          Set In
        </button>
        <button type="button" className="ops-btn ops-btn--info" disabled={busy} onClick={setOutHere}>
          Set Out
        </button>
        <button type="button" className="ops-btn" disabled={busy} onClick={previewClip}>
          Preview Clip
        </button>
        <button
          type="button"
          className="ops-btn ops-btn--warn"
          disabled={busy}
          onClick={() => void saveAdjustments()}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      {notice ? <p className="mc-notice">{notice}</p> : null}
      {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}
    </section>
  );
}
