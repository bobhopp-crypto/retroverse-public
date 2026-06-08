"use client";

import { useCallback, useRef } from "react";

type MagneticTimelineScrollbarProps = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  onScroll: (scrollLeft: number) => void;
};

export function MagneticTimelineScrollbar(props: MagneticTimelineScrollbarProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startScroll: number } | null>(null);

  const maxScroll = Math.max(0, props.scrollWidth - props.clientWidth);
  const scrollable = maxScroll > 0;

  const thumbRatio = scrollable ? props.clientWidth / props.scrollWidth : 1;
  const thumbWidthPct = Math.max(8, Math.min(100, thumbRatio * 100));
  const thumbLeftPct = scrollable
    ? (props.scrollLeft / maxScroll) * (100 - thumbWidthPct)
    : 0;

  const scrollFromClientX = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail || !scrollable) return;
      const rect = rail.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      props.onScroll(frac * maxScroll);
    },
    [maxScroll, props.onScroll, scrollable],
  );

  function onRailPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest(".ops-ml-magnetic-scrollbar__thumb")) return;
    scrollFromClientX(e.clientX);
  }

  function onThumbPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startScroll: props.scrollLeft };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onThumbPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || !rail || !scrollable) return;
    const rect = rail.getBoundingClientRect();
    const thumbTravel = rect.width * (1 - thumbRatio);
    if (thumbTravel <= 0) return;
    const delta = e.clientX - drag.startX;
    const scrollDelta = (delta / thumbTravel) * maxScroll;
    props.onScroll(Math.max(0, Math.min(maxScroll, drag.startScroll + scrollDelta)));
  }

  function onThumbPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  return (
    <div
      className={`ops-ml-magnetic-scrollbar${scrollable ? "" : " ops-ml-magnetic-scrollbar--disabled"}`}
      aria-hidden={!scrollable}
    >
      <div
        ref={railRef}
        className="ops-ml-magnetic-scrollbar__rail"
        onPointerDown={onRailPointerDown}
      >
        <div
          className="ops-ml-magnetic-scrollbar__thumb"
          style={{ left: `${thumbLeftPct}%`, width: `${thumbWidthPct}%` }}
          onPointerDown={onThumbPointerDown}
          onPointerMove={onThumbPointerMove}
          onPointerUp={onThumbPointerUp}
          onPointerCancel={onThumbPointerUp}
        />
      </div>
    </div>
  );
}
