"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";
import { formatChapterClock } from "@/lib/ops/media-lab/chapter-time";

export type TranscriptStripMode = "off" | "live" | "full";

const LIVE_CONTEXT_LINES = 3;
const DECK_LIVE_MAX_LINES = 8;
const DECK_CONTEXT_PAD_SEC = 18;

const MODE_HELP: Record<TranscriptStripMode, string> = {
  off: "Hide transcript text.",
  live: "Show current clip transcript while playing.",
  full: "Open full transcript for this clip.",
};

type ClipTranscriptStripProps = {
  segments: TranscriptSegment[];
  clipStartSec: number;
  clipEndSec: number;
  playheadSec: number;
  mode: TranscriptStripMode;
  onModeChange: (mode: TranscriptStripMode) => void;
  variant?: "default" | "deck";
  /** Hide Off/Live/Full toolbar (e.g. main deck — controls live in Advanced). */
  hideToolbar?: boolean;
  onSeek?: (sec: number) => void;
};

type TranscriptModeControlsProps = {
  mode: TranscriptStripMode;
  onModeChange: (mode: TranscriptStripMode) => void;
  showLabel?: boolean;
};

export function TranscriptModeControls(props: TranscriptModeControlsProps) {
  return (
    <div className="ops-ml-transcript-strip__toolbar">
      {props.showLabel !== false ? (
        <span className="ops-ml-transcript-strip__toolbar-label">Transcript display</span>
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
            title={MODE_HELP[m]}
            onClick={() => props.onModeChange(m)}
          >
            {m === "off" ? "Off" : m === "live" ? "Live" : "Full"}
          </button>
        ))}
      </div>
    </div>
  );
}

type TranscriptLine = {
  seg: TranscriptSegment;
  index: number;
  inClip: boolean;
  isContext: boolean;
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
  const [selectedStartSec, setSelectedStartSec] = useState<number | null>(null);
  const variant = props.variant ?? "default";
  const isDeck = variant === "deck";

  const clipLines = useMemo(
    () =>
      props.segments.filter((s) =>
        segmentOverlapsClip(s, props.clipStartSec, props.clipEndSec),
      ),
    [props.clipEndSec, props.clipStartSec, props.segments],
  );

  const deckLines = useMemo((): TranscriptLine[] => {
    if (!isDeck) return [];
    const from = props.clipStartSec - DECK_CONTEXT_PAD_SEC;
    const to = props.clipEndSec + DECK_CONTEXT_PAD_SEC;
    return props.segments
      .filter((s) => s.end > from && s.start < to)
      .map((seg) => {
        const inClip = segmentOverlapsClip(seg, props.clipStartSec, props.clipEndSec);
        return {
          seg,
          index: 0,
          inClip,
          isContext: !inClip,
        };
      });
  }, [isDeck, props.clipEndSec, props.clipStartSec, props.segments]);

  const activeIndex = useMemo(
    () => findActiveIndex(clipLines, props.playheadSec),
    [clipLines, props.playheadSec],
  );

  const deckActiveIndex = useMemo(() => {
    if (!isDeck || deckLines.length === 0) return -1;
    const idx = deckLines.findIndex(
      (l) => props.playheadSec >= l.seg.start && props.playheadSec < l.seg.end,
    );
    if (idx >= 0) return idx;
    const inClip = deckLines.filter((l) => l.inClip).map((l) => l.seg);
    const clipIdx = findActiveIndex(inClip, props.playheadSec);
    if (clipIdx < 0) return -1;
    const target = inClip[clipIdx];
    return deckLines.findIndex((l) => l.seg.start === target.start);
  }, [deckLines, isDeck, props.playheadSec]);

  const liveWindow = useMemo(() => {
    if (props.mode !== "live") return [];
    if (isDeck) {
      if (deckActiveIndex < 0) return deckLines.slice(0, DECK_LIVE_MAX_LINES);
      const from = Math.max(0, deckActiveIndex - LIVE_CONTEXT_LINES);
      const to = Math.min(deckLines.length, deckActiveIndex + LIVE_CONTEXT_LINES + 1);
      let slice = deckLines.slice(from, to);
      if (slice.length > DECK_LIVE_MAX_LINES) {
        const activeInSlice = slice.findIndex((_, i) => from + i === deckActiveIndex);
        const start = Math.max(0, activeInSlice - 3);
        slice = slice.slice(start, start + DECK_LIVE_MAX_LINES);
      }
      return slice;
    }
    if (activeIndex < 0) return [];
    const from = Math.max(0, activeIndex - LIVE_CONTEXT_LINES);
    const to = Math.min(clipLines.length, activeIndex + LIVE_CONTEXT_LINES + 1);
    return clipLines.slice(from, to).map((line, offset) => ({
      line,
      index: from + offset,
    }));
  }, [activeIndex, clipLines, deckActiveIndex, deckLines, isDeck, props.mode]);

  useEffect(() => {
    if (props.mode !== "live" || !activeRef.current) return;
    activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, deckActiveIndex, props.mode, props.playheadSec]);

  useEffect(() => {
    if (props.mode !== "full") setFullExpanded(false);
  }, [props.mode]);

  const rootClass = isDeck
    ? "ops-ml-transcript-strip ops-ml-transcript-strip--deck"
    : "ops-ml-transcript-strip";

  function renderDeckLine(line: TranscriptLine, isActive: boolean) {
    const isSelected = selectedStartSec === line.seg.start;
    return (
      <p
        key={`${line.seg.start}-${line.index}`}
        ref={isActive ? activeRef : undefined}
        className={[
          "ops-ml-transcript-strip__line",
          isActive ? "ops-ml-transcript-strip__line--active" : "",
          isSelected ? "ops-ml-transcript-strip__line--selected" : "",
          line.isContext ? "ops-ml-transcript-strip__line--context" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          setSelectedStartSec(line.seg.start);
          props.onSeek?.(line.seg.start);
        }}
        role="button"
        tabIndex={0}
      >
        <span className="ops-ml-transcript-strip__time">{formatChapterClock(line.seg.start)}</span>
        <span className="ops-ml-transcript-strip__text">
          {isActive ? `>> ${line.seg.text.trim()} <<` : line.seg.text.trim()}
        </span>
      </p>
    );
  }

  return (
    <div className={rootClass}>
      {props.hideToolbar ? null : (
        <TranscriptModeControls
          mode={props.mode}
          onModeChange={props.onModeChange}
          showLabel={!isDeck}
        />
      )}

      {props.mode === "off" ? null : clipLines.length === 0 && !isDeck ? (
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
                {deckLines.map((line, idx) =>
                  renderDeckLine(line, idx === deckActiveIndex),
                )}
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
                }${selectedStartSec === line.start ? " ops-ml-transcript-strip__line--selected" : ""}`}
                onClick={() => {
                  setSelectedStartSec(line.start);
                  props.onSeek?.(line.start);
                }}
                role="button"
                tabIndex={0}
              >
                {line.text.trim()}
              </p>
            ))}
          </div>
        )
      ) : isDeck ? (
        <div ref={scrollRef} className="ops-ml-transcript-strip__body ops-ml-transcript-strip__body--live">
          {liveWindow.length === 0 ? (
            <p className="ops-ml-transcript-strip__empty">No transcript for this clip.</p>
          ) : (
            (liveWindow as TranscriptLine[]).map((line) =>
              renderDeckLine(
                line,
                line.seg.start === deckLines[deckActiveIndex]?.seg.start,
              ),
            )
          )}
        </div>
      ) : (
        <div ref={scrollRef} className="ops-ml-transcript-strip__body ops-ml-transcript-strip__body--live">
          {(liveWindow as { line: TranscriptSegment; index: number }[]).map(({ line, index }) => (
            <p
              key={`${line.start}-${index}`}
              ref={index === activeIndex ? activeRef : undefined}
              className={`ops-ml-transcript-strip__line${
                index === activeIndex ? " ops-ml-transcript-strip__line--active" : ""
              }${selectedStartSec === line.start ? " ops-ml-transcript-strip__line--selected" : ""}`}
              onClick={() => {
                setSelectedStartSec(line.start);
                props.onSeek?.(line.start);
              }}
              role="button"
              tabIndex={0}
            >
              {index === activeIndex ? `>> ${line.text.trim()} <<` : line.text.trim()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
