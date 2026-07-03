"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  formatSearchZoneExport,
  HOME_SEARCH_ZONE,
  parsePosterRectPct,
  posterRectPctFromNums,
  posterRectPctStyle,
  type PosterRectNums,
} from "@/lib/home/poster-layout";

type DragMode = "move" | "resize-se" | "resize-e" | "resize-s";

function clampRect(r: PosterRectNums): PosterRectNums {
  const top = Math.max(0, Math.min(100, r.top));
  const left = Math.max(0, Math.min(100, r.left));
  const width = Math.max(1, Math.min(100 - left, r.width));
  const height = Math.max(1, Math.min(100 - top, r.height));
  return { top, left, width, height };
}

type Props = {
  frameRef: RefObject<HTMLDivElement | null>;
};

export function HomeSearchCalibrator({ frameRef }: Props) {
  const [rect, setRect] = useState<PosterRectNums>(() =>
    parsePosterRectPct(HOME_SEARCH_ZONE),
  );
  const [copied, setCopied] = useState(false);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    start: PosterRectNums;
  } | null>(null);

  const frameSize = useCallback(() => {
    const el = frameRef.current;
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { w: box.width, h: box.height };
  }, [frameRef]);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      const size = frameSize();
      if (!drag || !size) return;

      const dxPct = ((e.clientX - drag.startX) / size.w) * 100;
      const dyPct = ((e.clientY - drag.startY) / size.h) * 100;
      const s = drag.start;

      let next: PosterRectNums;
      if (drag.mode === "move") {
        next = {
          top: s.top + dyPct,
          left: s.left + dxPct,
          width: s.width,
          height: s.height,
        };
      } else if (drag.mode === "resize-se") {
        next = {
          top: s.top,
          left: s.left,
          width: s.width + dxPct,
          height: s.height + dyPct,
        };
      } else if (drag.mode === "resize-e") {
        next = {
          top: s.top,
          left: s.left,
          width: s.width + dxPct,
          height: s.height,
        };
      } else {
        next = {
          top: s.top,
          left: s.left,
          width: s.width,
          height: s.height + dyPct,
        };
      }

      setRect(clampRect(next));
    },
    [frameSize],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  }, [onPointerMove]);

  const startDrag = (mode: DragMode, e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      start: rect,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  };

  useEffect(() => () => endDrag(), [endDrag]);

  const pct = posterRectPctFromNums(rect);
  const exportSnippet = formatSearchZoneExport(rect);

  const copyValues = async () => {
    try {
      await navigator.clipboard.writeText(exportSnippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: HUD still shows snippet */
    }
  };

  return (
    <>
      <div
        className="home-search-calibrate"
        style={posterRectPctStyle(pct)}
        aria-hidden="true"
      >
        <span
          className="home-search-calibrate__label"
          onPointerDown={(e) => startDrag("move", e)}
        >
          SEARCH
        </span>
        <span
          className="home-search-calibrate__handle home-search-calibrate__handle--e"
          onPointerDown={(e) => startDrag("resize-e", e)}
          title="Resize width"
        />
        <span
          className="home-search-calibrate__handle home-search-calibrate__handle--s"
          onPointerDown={(e) => startDrag("resize-s", e)}
          title="Resize height"
        />
        <span
          className="home-search-calibrate__handle home-search-calibrate__handle--se"
          onPointerDown={(e) => startDrag("resize-se", e)}
          title="Resize"
        />
      </div>

      <div className="home-calibrate-hud" role="status">
        <p className="home-calibrate-hud__title">Search hotspot (% of poster)</p>
        <dl className="home-calibrate-hud__vals">
          <div>
            <dt>left</dt>
            <dd>{pct.left}</dd>
          </div>
          <div>
            <dt>top</dt>
            <dd>{pct.top}</dd>
          </div>
          <div>
            <dt>width</dt>
            <dd>{pct.width}</dd>
          </div>
          <div>
            <dt>height</dt>
            <dd>{pct.height}</dd>
          </div>
        </dl>
        <button type="button" className="home-calibrate-hud__copy" onClick={copyValues}>
          {copied ? "Copied" : "Copy HOME_SEARCH_ZONE"}
        </button>
        <pre className="home-calibrate-hud__snippet">{exportSnippet}</pre>
      </div>
    </>
  );
}
