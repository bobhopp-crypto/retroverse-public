"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatChapterClock } from "@/lib/ops/media-lab/chapter-time";

type ClipTimelineChapter = {
  id: string;
  startSec: number;
  endSec: number;
  title: string;
};

export type ClipTimelineHandle = "start" | "end";

type ClipTimelineProps = {
  videoDurationSec: number;
  chapters: ClipTimelineChapter[];
  activeChapterId: string;
  playheadSec: number;
  onAdjustStart: (chapterId: string, startSec: number) => void;
  onAdjustEnd: (chapterId: string, endSec: number) => void;
  activeHandle?: ClipTimelineHandle;
  onActiveHandleChange?: (handle: ClipTimelineHandle) => void;
};

type DragKind = ClipTimelineHandle;

const MIN_CLIP_SEC = 1;

function formatVideoDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ClipTimeline(props: ClipTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragKind | null>(null);
  const [dragSec, setDragSec] = useState<number | null>(null);
  const [localHandle, setLocalHandle] = useState<ClipTimelineHandle>("start");

  const activeHandle = props.activeHandle ?? localHandle;

  const setActiveHandle = useCallback(
    (handle: ClipTimelineHandle) => {
      setLocalHandle(handle);
      props.onActiveHandleChange?.(handle);
    },
    [props.onActiveHandleChange],
  );

  const active =
    props.chapters.find((c) => c.id === props.activeChapterId) ?? null;
  const duration = Math.max(props.videoDurationSec, 0.001);

  const pct = useCallback(
    (sec: number) => `${Math.max(0, Math.min(100, (sec / duration) * 100))}%`,
    [duration],
  );

  const clientXToSec = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return 0;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(frac * duration * 100) / 100;
    },
    [duration],
  );

  const clampStart = useCallback(
    (sec: number) => {
      if (!active) return sec;
      const idx = props.chapters.findIndex((c) => c.id === active.id);
      const prev = idx > 0 ? props.chapters[idx - 1] : null;
      const min = prev ? prev.startSec + MIN_CLIP_SEC : 0;
      const max = active.endSec - MIN_CLIP_SEC;
      return Math.max(min, Math.min(max, sec));
    },
    [active, props.chapters],
  );

  const clampEnd = useCallback(
    (sec: number) => {
      if (!active) return sec;
      const idx = props.chapters.findIndex((c) => c.id === active.id);
      const next = idx >= 0 && idx < props.chapters.length - 1 ? props.chapters[idx + 1] : null;
      const min = active.startSec + MIN_CLIP_SEC;
      const max = next ? next.endSec - MIN_CLIP_SEC : duration;
      return Math.max(min, Math.min(max, sec));
    },
    [active, duration, props.chapters],
  );

  useEffect(() => {
    if (!drag || !active) return;
    const chapterId = active.id;

    function onMove(e: PointerEvent) {
      const raw = clientXToSec(e.clientX);
      if (drag === "start") {
        const sec = clampStart(raw);
        setDragSec(sec);
        props.onAdjustStart(chapterId, sec);
      } else {
        const sec = clampEnd(raw);
        setDragSec(sec);
        props.onAdjustEnd(chapterId, sec);
      }
    }

    function onUp() {
      setDrag(null);
      setDragSec(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [active, clampEnd, clampStart, clientXToSec, drag, props.onAdjustEnd, props.onAdjustStart]);

  if (!active || duration <= 0) return null;

  const displayStart = drag === "start" && dragSec != null ? dragSec : active.startSec;
  const displayEnd = drag === "end" && dragSec != null ? dragSec : active.endSec;

  function beginDrag(kind: DragKind, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActiveHandle(kind);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag(kind);
    setDragSec(kind === "start" ? active!.startSec : active!.endSec);
  }

  function nudge(deltaSec: number) {
    if (!active) return;
    if (activeHandle === "start") {
      props.onAdjustStart(active.id, clampStart(active.startSec + deltaSec));
    } else {
      props.onAdjustEnd(active.id, clampEnd(active.endSec + deltaSec));
    }
  }

  return (
    <div className="ops-ml-clip-timeline">
      <div className="ops-ml-clip-timeline__label-row">
        <span className="ops-ml-clip-timeline__label">Full video</span>
        <span className="ops-dim ops-ml-clip-timeline__range">
          {formatChapterClock(displayStart)} – {formatChapterClock(displayEnd)} ·{" "}
          {formatVideoDur(displayEnd - displayStart)}
        </span>
      </div>
      <div className="ops-ml-clip-timeline__track" ref={trackRef}>
        {props.chapters
          .filter((ch) => ch.id !== active.id)
          .map((ch) => (
            <div
              key={ch.id}
              className="ops-ml-clip-timeline__segment"
              style={{
                left: pct(ch.startSec),
                width: pct(ch.endSec - ch.startSec),
              }}
              title={ch.title}
            />
          ))}
        <div
          className="ops-ml-clip-timeline__clip"
          style={{
            left: pct(displayStart),
            width: pct(displayEnd - displayStart),
          }}
        >
          <button
            type="button"
            className={[
              "ops-ml-clip-timeline__handle",
              "ops-ml-clip-timeline__handle--start",
              activeHandle === "start" ? "ops-ml-clip-timeline__handle--active" : "",
              drag === "start" ? "ops-ml-clip-timeline__handle--drag" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Adjust clip start"
            aria-pressed={activeHandle === "start"}
            onPointerDown={(e) => beginDrag("start", e)}
          />
          <div className="ops-ml-clip-timeline__clip-body" />
          <button
            type="button"
            className={[
              "ops-ml-clip-timeline__handle",
              "ops-ml-clip-timeline__handle--end",
              activeHandle === "end" ? "ops-ml-clip-timeline__handle--active" : "",
              drag === "end" ? "ops-ml-clip-timeline__handle--drag" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Adjust clip end"
            aria-pressed={activeHandle === "end"}
            onPointerDown={(e) => beginDrag("end", e)}
          />
        </div>
        <div
          className="ops-ml-clip-timeline__playhead"
          style={{ left: pct(props.playheadSec) }}
          aria-hidden
        />
      </div>
      <div className="ops-ml-clip-timeline__ticks">
        <span>0:00</span>
        <span>{formatVideoDur(duration)}</span>
      </div>
      <div className="ops-ml-clip-timeline__trim">
        <span className="ops-ml-clip-timeline__trim-label">
          Trim{" "}
          <strong>{activeHandle === "start" ? "start" : "end"}</strong>
        </span>
        <div className="ops-ml-clip-timeline__trim-btns">
          {([-5, -1, 1, 5] as const).map((delta) => (
            <button
              key={delta}
              type="button"
              className="ops-btn ops-btn--sm ops-ml-clip-timeline__trim-btn"
              onClick={() => nudge(delta)}
            >
              {delta > 0 ? `+${delta}s` : `${delta}s`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
