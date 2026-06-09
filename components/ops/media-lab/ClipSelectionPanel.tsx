"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChapterThumbSet } from "./ChapterThumbTriplet";

export type ClipSelectionState = {
  inSeconds?: number;
  outSeconds?: number;
};

const MIN_SELECTION_SEC = 1;

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

type DragKind = "in" | "out" | "body";

type DragAnchor = {
  kind: DragKind;
  fixedIn: number;
  fixedOut: number;
  anchorSec: number;
};

type ClipSelectionPanelProps = {
  clipStartSec: number;
  clipEndSec: number;
  playheadSec: number;
  selection: ClipSelectionState;
  thumbs: ChapterThumbSet | null;
  thumbsLoading: boolean;
  onSelectionChange: (next: ClipSelectionState) => void;
  onSeek: (sec: number) => void;
  onTrimDragStart?: () => void;
  onTrimPreview?: (sec: number) => void;
  onTrimDragEnd?: (sec: number) => void;
  onSplitAtPlayhead?: () => void;
};

export function ClipSelectionPanel(props: ClipSelectionPanelProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragKind | null>(null);
  const [playheadHover, setPlayheadHover] = useState(false);
  const dragRef = useRef<DragAnchor | null>(null);
  const selectionRef = useRef(props.selection);
  selectionRef.current = props.selection;

  const clipStart = props.clipStartSec;
  const clipEnd = props.clipEndSec;
  const clipDur = Math.max(clipEnd - clipStart, MIN_SELECTION_SEC);

  const inSec = props.selection.inSeconds ?? clipStart;
  const outSec = props.selection.outSeconds ?? clipEnd;
  const lenSec = selectionLengthSeconds({ inSeconds: inSec, outSeconds: outSec });

  const displayPlayheadSec =
    drag === "in" ? inSec : drag === "out" ? outSec : props.playheadSec;

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
    (clientX: number, precise = false) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return clipStart;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = clipStart + frac * clipDur;
      return precise ? raw : Math.round(raw);
    },
    [clipDur, clipStart],
  );

  const updateSelection = useCallback(
    (patch: Partial<ClipSelectionState>) => {
      props.onSelectionChange({ ...selectionRef.current, ...patch });
    },
    [props.onSelectionChange],
  );

  const previewAtSec = useCallback(
    (sec: number) => {
      if (props.onTrimPreview) props.onTrimPreview(sec);
      else props.onSeek(sec);
    },
    [props.onSeek, props.onTrimPreview],
  );

  const applyDrag = useCallback(
    (raw: number) => {
      const anchor = dragRef.current;
      if (!anchor) return;

      if (anchor.kind === "in") {
        const nextIn = Math.max(
          clipStart,
          Math.min(anchor.fixedOut - MIN_SELECTION_SEC, raw),
        );
        updateSelection({ inSeconds: nextIn, outSeconds: anchor.fixedOut });
        previewAtSec(nextIn);
        return;
      }

      if (anchor.kind === "out") {
        const nextOut = Math.max(
          anchor.fixedIn + MIN_SELECTION_SEC,
          Math.min(clipEnd, raw),
        );
        updateSelection({ inSeconds: anchor.fixedIn, outSeconds: nextOut });
        previewAtSec(nextOut);
        return;
      }

      const span = anchor.fixedOut - anchor.fixedIn;
      const delta = raw - anchor.anchorSec;
      let nextIn = anchor.fixedIn + delta;
      let nextOut = nextIn + span;
      if (nextIn < clipStart) {
        nextIn = clipStart;
        nextOut = nextIn + span;
      }
      if (nextOut > clipEnd) {
        nextOut = clipEnd;
        nextIn = nextOut - span;
      }
      if (nextIn < clipStart) nextIn = clipStart;
      if (nextOut - nextIn < MIN_SELECTION_SEC) return;
      updateSelection({ inSeconds: nextIn, outSeconds: nextOut });
      previewAtSec(nextIn + span / 2);
    },
    [clipEnd, clipStart, previewAtSec, updateSelection],
  );

  useEffect(() => {
    if (!drag) return;

    function onMove(e: PointerEvent) {
      if (!dragRef.current) return;
      applyDrag(clientXToSec(e.clientX, true));
    }

    function onUp(e: PointerEvent) {
      const anchor = dragRef.current;
      if (!anchor) return;
      applyDrag(clientXToSec(e.clientX, true));
      const endSec =
        anchor.kind === "in"
          ? selectionRef.current.inSeconds ?? anchor.fixedIn
          : anchor.kind === "out"
            ? selectionRef.current.outSeconds ?? anchor.fixedOut
            : selectionRef.current.inSeconds ?? anchor.fixedIn;
      props.onTrimDragEnd?.(endSec);
      dragRef.current = null;
      setDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [applyDrag, clientXToSec, drag, props.onTrimDragEnd]);

  function startDrag(anchor: DragAnchor, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    props.onTrimDragStart?.();
    dragRef.current = anchor;
    setDrag(anchor.kind);
    previewAtSec(anchor.kind === "out" ? anchor.fixedOut : anchor.fixedIn);
  }

  function beginBodyDrag(e: React.PointerEvent) {
    startDrag(
      {
        kind: "body",
        fixedIn: inSec,
        fixedOut: outSec,
        anchorSec: clientXToSec(e.clientX, true),
      },
      e,
    );
  }

  function beginDrag(kind: "in" | "out", e: React.PointerEvent) {
    startDrag(
      {
        kind,
        fixedIn: inSec,
        fixedOut: outSec,
        anchorSec: kind === "in" ? inSec : outSec,
      },
      e,
    );
  }

  function handleTrackPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest(".ops-ml-clip-timeline__handle")) return;
    if ((e.target as HTMLElement).closest(".ops-ml-selection__playhead")) return;
    if ((e.target as HTMLElement).closest(".ops-ml-selection__range-body")) return;

    const sec = clientXToSec(e.clientX);

    if (sec > inSec && sec < outSec) {
      props.onSeek(sec);
      return;
    }

    if (sec <= inSec) {
      const nextIn = Math.max(clipStart, Math.min(outSec - MIN_SELECTION_SEC, sec));
      props.onTrimDragStart?.();
      updateSelection({ inSeconds: nextIn, outSeconds: outSec });
      previewAtSec(nextIn);
      return;
    }

    const nextOut = Math.max(inSec + MIN_SELECTION_SEC, Math.min(clipEnd, sec));
    props.onTrimDragStart?.();
    updateSelection({ inSeconds: inSec, outSeconds: nextOut });
    previewAtSec(nextOut);
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
          className="ops-ml-selection__keep"
          style={{ left: pct(inSec), width: pctSpan(outSec - inSec) }}
          aria-hidden
        />

        <div
          className="ops-ml-selection__dim ops-ml-selection__dim--left"
          style={{ left: 0, width: pct(inSec) }}
        />
        <div
          className="ops-ml-selection__dim ops-ml-selection__dim--right"
          style={{ left: pct(outSec), width: pctSpan(clipEnd - outSec) }}
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
              "ops-ml-selection__handle--in",
              drag === "in" ? "ops-ml-clip-timeline__handle--drag" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="IN trim handle"
            onPointerDown={(e) => beginDrag("in", e)}
          >
            <span className="ops-ml-selection__handle-tag">IN</span>
          </button>
          <div
            className={`ops-ml-selection__range-body${drag === "body" ? " ops-ml-selection__range-body--drag" : ""}`}
            aria-label="Drag clip — moves IN and OUT together"
            onPointerDown={beginBodyDrag}
          />
          <button
            type="button"
            className={[
              "ops-ml-clip-timeline__handle",
              "ops-ml-clip-timeline__handle--end",
              "ops-ml-selection__handle",
              "ops-ml-selection__handle--out",
              drag === "out" ? "ops-ml-clip-timeline__handle--drag" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="OUT trim handle"
            onPointerDown={(e) => beginDrag("out", e)}
          >
            <span className="ops-ml-selection__handle-tag">OUT</span>
          </button>
        </div>

        <div
          className={[
            "ops-ml-clip-timeline__playhead",
            "ops-ml-selection__playhead",
            playheadHover && props.onSplitAtPlayhead ? "ops-ml-selection__playhead--hover" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ left: pct(Math.max(clipStart, Math.min(clipEnd, displayPlayheadSec))) }}
          role="separator"
          aria-label="Playhead — double-click to split chapter"
          onMouseEnter={() => setPlayheadHover(true)}
          onMouseLeave={() => setPlayheadHover(false)}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.onSplitAtPlayhead?.();
          }}
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
            {formatReviewClock(Math.round(displayPlayheadSec))}
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
