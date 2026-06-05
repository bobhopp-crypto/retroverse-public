"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";

export type TranscriptStripMode = "off" | "live" | "full";

const LIVE_CONTEXT_LINES = 3;
const DECK_LIVE_MAX_LINES = 8;

type ClipTranscriptStripProps = {
  segments: TranscriptSegment[];
  clipStartSec: number;
  clipEndSec: number;
  playheadSec: number;
  mode: TranscriptStripMode;
  onModeChange: (mode: TranscriptStripMode) => void;
  variant?: "default" | "deck";
};

function segmentOverlapsClip(seg: TranscriptSegment, start: number, end: number): boolean {
  return seg.end > start && seg.start < end;
}

function findActiveIndex(lines: TranscriptSegment[], playheadSec: number): number {
  if (lines.length === 0) return -1;
  let idx = lines.findIndex((s) => playheadSec >= s.start && playheadSec < s.end);
  if (idx >= 0) return idx;
  if (playheadSec < lines[0].start) return 0;
  if (playheadSec >= lines[lines.length - 1].end) return lines.length - 1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (playheadSec >= lines[i].end && playheadSec < lines[i + 1].start) {
      return i + 1;
    }
  }
  return lines.length - 1;
}

export function ClipTranscriptStrip(props: ClipTranscriptStripProps) {
  const activeRef = useRef<HTMLParagraphElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fullExpanded, setFullExpanded] = useState(false);
  const variant = props.variant ?? "default";
  const isDeck = variant === "deck";

  const clipLines = useMemo(
    () =>
      props.segments.filter((s) =>
        segmentOverlapsClip(s, props.clipStartSec, props.clipEndSec),
      ),
    [props.clipEndSec, props.clipStartSec, props.segments],
  );

  const activeIndex = useMemo(
    () => findActiveIndex(clipLines, props.playheadSec),
    [clipLines, props.playheadSec],
  );

  const liveWindow = useMemo(() => {
    if (props.mode !== "live" || activeIndex < 0) return [];
    const from = Math.max(0, activeIndex - LIVE_CONTEXT_LINES);
    const to = Math.min(clipLines.length, activeIndex + LIVE_CONTEXT_LINES + 1);
    const slice = clipLines.slice(from, to).map((line, offset) => ({
      line,
      index: from + offset,
    }));
    if (isDeck && slice.length > DECK_LIVE_MAX_LINES) {
      const activeInSlice = slice.findIndex((s) => s.index === activeIndex);
      const start = Math.max(0, activeInSlice - 3);
      return slice.slice(start, start + DECK_LIVE_MAX_LINES);
    }
    return slice;
  }, [activeIndex, clipLines, isDeck, props.mode]);

  useEffect(() => {
    if (props.mode !== "live" || !activeRef.current) return;
    activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, props.mode, props.playheadSec]);

  useEffect(() => {
    if (props.mode !== "full") setFullExpanded(false);
  }, [props.mode]);

  const modeHelp: Record<TranscriptStripMode, string> = {
    off: "Hide transcript text.",
    live: "Show current clip transcript while playing.",
    full: "Open full transcript for this clip.",
  };

  const rootClass = isDeck
    ? "ops-ml-transcript-strip ops-ml-transcript-strip--deck"
    : "ops-ml-transcript-strip";

  return (
    <div className={rootClass}>
      <div className="ops-ml-transcript-strip__toolbar">
        {!isDeck ? (
          <span className="ops-ml-transcript-strip__toolbar-label">Display</span>
        ) : null}
        <div className="ops-ml-transcript-strip__modes" role="group" aria-label="Transcript mode">
          {(["off", "live", "full"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`ops-ml-transcript-strip__mode${
                props.mode === m ? " ops-ml-transcript-strip__mode--on" : ""
              }`}
              aria-pressed={props.mode === m}
              title={modeHelp[m]}
              onClick={() => props.onModeChange(m)}
            >
              {m === "off" ? "Off" : m === "live" ? "Live" : "Full"}
            </button>
          ))}
        </div>
      </div>

      {props.mode === "off" ? null : clipLines.length === 0 ? (
        <p className="ops-ml-transcript-strip__empty">No transcript for this clip.</p>
      ) : props.mode === "full" ? (
        isDeck ? (
          <div className="ops-ml-transcript-strip__full-deck">
            <button
              type="button"
              className="ops-ml-transcript-strip__full-toggle"
              aria-expanded={fullExpanded}
              onClick={() => setFullExpanded((v) => !v)}
            >
              {fullExpanded ? "Collapse full transcript" : "Expand full transcript"}
            </button>
            {fullExpanded ? (
              <div
                ref={scrollRef}
                className="ops-ml-transcript-strip__body ops-ml-transcript-strip__body--full-deck"
              >
                {clipLines.map((line, idx) => (
                  <p
                    key={`${line.start}-${idx}`}
                    ref={idx === activeIndex ? activeRef : undefined}
                    className={`ops-ml-transcript-strip__line${
                      idx === activeIndex ? " ops-ml-transcript-strip__line--active" : ""
                    }`}
                  >
                    {line.text.trim()}
                  </p>
                ))}
              </div>
            ) : (
              <p className="ops-ml-transcript-strip__full-hint">
                {clipLines.length} lines — click to expand
              </p>
            )}
          </div>
        ) : (
          <div ref={scrollRef} className="ops-ml-transcript-strip__body ops-ml-transcript-strip__body--full">
            {clipLines.map((line, idx) => (
              <p
                key={`${line.start}-${idx}`}
                ref={idx === activeIndex ? activeRef : undefined}
                className={`ops-ml-transcript-strip__line${
                  idx === activeIndex ? " ops-ml-transcript-strip__line--active" : ""
                }`}
              >
                {line.text.trim()}
              </p>
            ))}
          </div>
        )
      ) : (
        <div ref={scrollRef} className="ops-ml-transcript-strip__body ops-ml-transcript-strip__body--live">
          {liveWindow.map(({ line, index }) => (
            <p
              key={`${line.start}-${index}`}
              ref={index === activeIndex ? activeRef : undefined}
              className={`ops-ml-transcript-strip__line${
                index === activeIndex ? " ops-ml-transcript-strip__line--active" : ""
              }`}
            >
              {index === activeIndex ? `>> ${line.text.trim()} <<` : line.text.trim()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
