"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChapterThumbSet } from "./ChapterThumbTriplet";

export type ClipSelectionState = {
  inSeconds?: number;
  outSeconds?: number;
};

const MIN_SELECTION_SEC = 1;
const HANDLE_HIT_PX = 22;

export function selectionLengthSeconds(
  selection: ClipSelectionState,
): number | undefined {
  const { inSeconds, outSeconds } = selection;
  if (inSeconds == null || outSeconds == null || outSeconds <= inSeconds) {
    return undefined;
  }
  return outSeconds - inSeconds;
}

function formatReviewClock(sec?: number): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type DragKind = "in" | "out";

type ClipSelectionPanelProps = {
  clipStartSec: number;
  clipEndSec: number;
  playheadSec: number;
  selection: ClipSelectionState;
  thumbs: ChapterThumbSet | null;
  thumbsLoading: boolean;
  onSelectionChange: (next: ClipSelectionState) => void;
  onSeek: (sec: number) => void;
};

export function ClipSelectionPanel(props: ClipSelectionPanelProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragKind | null>(null);

  const clipStart = props.clipStartSec;
  const clipEnd = props.clipEndSec;
  const clipDur = Math.max(clipEnd - clipStart, MIN_SELECTION_SEC);

  const inSec = props.selection.inSeconds ?? clipStart;
  const outSec = props.selection.outSeconds ?? clipEnd;
  const lenSec = selectionLengthSeconds({ inSeconds: inSec, outSeconds: outSec });

  const pct = useCallback(
    (sec: number) => {
      const rel = (sec - clipStart) / clipDur;
      return `${Math.max(0, Math.min(100, rel * 100))}%`;
    },
    [clipDur, clipStart],
  );

  const pctSpan = useCallback(
    (spanSec: number) => {
      const rel = spanSec / clipDur;
      return `${Math.max(0, Math.min(100, rel * 100))}%`;
    },
    [clipDur],
  );

  const clientXToSec = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return clipStart;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return clipStart + Math.round(frac * clipDur);
    },
    [clipDur, clipStart],
  );

  const clampIn = useCallback(
    (sec: number) => Math.max(clipStart, Math.min(outSec - MIN_SELECTION_SEC, sec)),
    [clipStart, outSec],
  );

  const clampOut = useCallback(
    (sec: number) => Math.max(inSec + MIN_SELECTION_SEC, Math.min(clipEnd, sec)),
    [clipEnd, inSec],
  );

  const updateSelection = useCallback(
    (patch: Partial<ClipSelectionState>) => {
      props.onSelectionChange({ ...props.selection, ...patch });
    },
    [props.onSelectionChange, props.selection],
  );

  useEffect(() => {
    if (!drag) return;

    function onMove(e: PointerEvent) {
      const raw = clientXToSec(e.clientX);
      if (drag === "in") updateSelection({ inSeconds: clampIn(raw) });
      else updateSelection({ outSeconds: clampOut(raw) });
    }

    function onUp() {
      setDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clampIn, clampOut, clientXToSec, drag, updateSelection]);

  function beginDrag(kind: DragKind, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag(kind);
  }

  function handleTrackPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest(".ops-ml-clip-timeline__handle")) return;

    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const inX = ((inSec - clipStart) / clipDur) * rect.width;
    const outX = ((outSec - clipStart) / clipDur) * rect.width;
    const distIn = Math.abs(x - inX);
    const distOut = Math.abs(x - outX);

    if (distIn <= HANDLE_HIT_PX || distOut <= HANDLE_HIT_PX) {
      const sec = clientXToSec(e.clientX);
      if (distIn <= distOut) updateSelection({ inSeconds: clampIn(sec) });
      else updateSelection({ outSeconds: clampOut(sec) });
      return;
    }

    props.onSeek(clientXToSec(e.clientX));
  }

  const thumbFrames = props.thumbs
    ? [props.thumbs.first, props.thumbs.mid, props.thumbs.last]
    : [];

  return (
    <section className="ops-ml-selection ops-ml-selection--timeline" aria-label="Clip trim">
      <div
        ref={trackRef}
        className="ops-ml-clip-timeline__track ops-ml-selection__track"
        onPointerDown={handleTrackPointerDown}
      >
        <div className="ops-ml-selection__thumb-rail" aria-hidden="true">
          {thumbFrames.length > 0
            ? thumbFrames.map((frame, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${frame.sec}-${i}`}
                  className="ops-ml-selection__thumb-frame"
                  src={frame.url}
                  alt=""
                  draggable={false}
                />
              ))
            : props.thumbsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="ops-ml-selection__thumb-frame ops-ml-selection__thumb-frame--empty">
                    …
                  </span>
                ))
              : Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="ops-ml-selection__thumb-frame ops-ml-selection__thumb-frame--empty">
                    —
                  </span>
                ))}
        </div>

        <div
          className="ops-ml-selection__dim ops-ml-selection__dim--left"
          style={{ left: 0, width: pct(inSec) }}
        />
        <div
          className="ops-ml-selection__dim ops-ml-selection__dim--right"
          style={{ left: pct(outSec), right: 0 }}
        />

        <div
          className="ops-ml-selection__range"
          style={{ left: pct(inSec), width: pctSpan(outSec - inSec) }}
        >
          <button
            type="button"
            className={[
              "ops-ml-clip-timeline__handle",
              "ops-ml-clip-timeline__handle--start",
              "ops-ml-selection__handle",
              drag === "in" ? "ops-ml-clip-timeline__handle--drag" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Adjust IN"
            onPointerDown={(e) => beginDrag("in", e)}
          />
          <div className="ops-ml-selection__range-body" />
          <button
            type="button"
            className={[
              "ops-ml-clip-timeline__handle",
              "ops-ml-clip-timeline__handle--end",
              "ops-ml-selection__handle",
              drag === "out" ? "ops-ml-clip-timeline__handle--drag" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Adjust OUT"
            onPointerDown={(e) => beginDrag("out", e)}
          />
        </div>

        <div
          className="ops-ml-clip-timeline__playhead ops-ml-selection__playhead"
          style={{ left: pct(Math.max(clipStart, Math.min(clipEnd, props.playheadSec))) }}
          aria-hidden
        />
      </div>

      <div className="ops-ml-selection__readouts" aria-live="polite">
        <div className="ops-ml-selection__readout">
          <span className="ops-ml-selection__readout-label">IN</span>
          <span className="ops-ml-selection__readout-value">{formatReviewClock(inSec)}</span>
        </div>
        <div className="ops-ml-selection__readout">
          <span className="ops-ml-selection__readout-label">PLAYHEAD</span>
          <span className="ops-ml-selection__readout-value">
            {formatReviewClock(Math.round(props.playheadSec))}
          </span>
        </div>
        <div className="ops-ml-selection__readout">
          <span className="ops-ml-selection__readout-label">OUT</span>
          <span className="ops-ml-selection__readout-value">{formatReviewClock(outSec)}</span>
        </div>
        <div className="ops-ml-selection__readout">
          <span className="ops-ml-selection__readout-label">LENGTH</span>
          <span className="ops-ml-selection__readout-value">{formatReviewClock(lenSec)}</span>
        </div>
      </div>
    </section>
  );
}
