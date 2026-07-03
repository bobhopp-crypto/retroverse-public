"use client";

import { useRef } from "react";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import { secToMinimapFrac } from "@/lib/ops/media-lab/magnetic-timeline-nav";
import type { TimelineSearchHit } from "@/lib/ops/media-lab/timeline-transcript-search";

type MagneticTimelineMinimapProps = {
  chapters: EditorialChapterRow[];
  showDurationSec: number;
  playheadSec: number;
  viewportStartSec: number;
  viewportEndSec: number;
  searchHits?: TimelineSearchHit[];
  searchHitIds?: Set<string>;
  onNavigate: (sec: number) => void;
};

export function MagneticTimelineMinimap(props: MagneticTimelineMinimapProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const dur = Math.max(props.showDurationSec, 1);
  const searchHitIds = props.searchHitIds ?? new Set<string>();
  const searchHits = props.searchHits ?? [];

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    props.onNavigate(frac * dur);
  }

  const playheadPct = `${secToMinimapFrac(props.playheadSec, dur) * 100}%`;
  const viewLeftPct = `${secToMinimapFrac(props.viewportStartSec, dur) * 100}%`;
  const viewWidthPct = `${Math.max(2, secToMinimapFrac(props.viewportEndSec - props.viewportStartSec, dur) * 100)}%`;

  return (
    <div className="ops-ml-magnetic-minimap" aria-label="Timeline overview">
      <div
        ref={railRef}
        className="ops-ml-magnetic-minimap__rail"
        role="slider"
        aria-label="Navigate timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(props.playheadSec)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
      >
        {props.chapters.map((ch) => {
          const left = secToMinimapFrac(ch.startSec, dur) * 100;
          const width = Math.max(
            0.4,
            secToMinimapFrac(Math.max(ch.endSec - ch.startSec, 0.1), dur) * 100,
          );
          const isKeep = ch.reviewStatus === "Keep";
          const isReject = ch.reviewStatus === "Reject";
          const isSearchHit = searchHitIds.has(ch.id);
          return (
            <span
              key={ch.id}
              className={[
                "ops-ml-magnetic-minimap__clip",
                isKeep ? "ops-ml-magnetic-minimap__clip--keep" : "",
                isReject ? "ops-ml-magnetic-minimap__clip--reject" : "",
                isSearchHit ? "ops-ml-magnetic-minimap__clip--search-hit" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={ch.title}
            />
          );
        })}
        {searchHits.map((hit) => (
          <span
            key={`search-${hit.chapterId}-${hit.matchSec}`}
            className="ops-ml-magnetic-minimap__search-marker"
            style={{ left: `${secToMinimapFrac(hit.matchSec, dur) * 100}%` }}
            title={`${hit.chapter.title} @ ${Math.round(hit.matchSec)}s`}
            aria-hidden
          />
        ))}
        <span
          className="ops-ml-magnetic-minimap__viewport"
          style={{ left: viewLeftPct, width: viewWidthPct }}
          aria-hidden
        />
        <span
          className="ops-ml-magnetic-minimap__playhead"
          style={{ left: playheadPct }}
          aria-hidden
        />
      </div>
    </div>
  );
}
