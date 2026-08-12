"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import {
  clipWidthPx,
  magneticTrackWidthPx,
  MERGE_HANDLE_WIDTH_PX,
  sourceSecToMagneticX,
  magneticXToSourceSec,
  visibleSourceRange,
} from "@/lib/ops/media-lab/magnetic-timeline-nav";
import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";
import {
  searchHitChapterIds,
  type TimelineSearchHit,
} from "@/lib/ops/media-lab/timeline-transcript-search";

import { MagneticTimelineMinimap } from "./MagneticTimelineMinimap";
import { MagneticTimelineScrollbar } from "./MagneticTimelineScrollbar";
import { TimelineTranscriptSearch } from "./TimelineTranscriptSearch";
import type { ChapterThumbSet } from "./ChapterThumbTriplet";

const WINDOW_SIZE = 15;
const SHORT_CHAPTER_SEC = 5;
const MIN_CLIP_SEC_FALLBACK = 1;

/** Legacy default — magnetic zoom center. */
export const TIMELINE_PX_PER_SEC = 7;

/** Magnetic timeline V2 zoom range (px per second of clip duration). */
export const MAGNETIC_ZOOM_MIN = 2;
export const MAGNETIC_ZOOM_MAX = 18;
export const MAGNETIC_ZOOM_DEFAULT = 7;
export { MERGE_HANDLE_WIDTH_PX } from "@/lib/ops/media-lab/magnetic-timeline-nav";
export const MAGNETIC_MIN_CLIP_WIDTH_PX = 48;
export const THUMB_TILE_WIDTH_PX = 40;
export const MAGNETIC_THUMB_HEIGHT_PX = 72;

const ZOOM_STORAGE_KEY = "ops-ml-magnetic-zoom";

/** Harvest strip — equal cells (legacy). */
export const HARVEST_CELL_WIDTH_PX = 100;
export const HARVEST_THUMB_HEIGHT_PX = 76;

type ClipQueueFilmstripProps = {
  chapters: EditorialChapterRow[];
  activeId: string | null;
  thumbs: Record<string, ChapterThumbSet>;
  thumbsLoading: boolean;
  onSelect: (chapter: EditorialChapterRow) => void;
  onMergeBoundary?: (boundaryIndex: number) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onSplitAtPlayhead?: () => void;
  flashIds?: string[];
  pxPerSec?: number;
  titleAcceptedIds?: Record<string, boolean>;
  playheadSec?: number;
  showDurationSec?: number;
  onSeek?: (sec: number) => void;
  layout?: "horizontal" | "filmstrip" | "harvest" | "magnetic" | "sidebar";
  queueCount?: number;
  segments?: TranscriptSegment[];
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onSearchNavigate?: (direction: "next" | "prev") => void;
  searchHits?: TimelineSearchHit[];
  timelineScrollToken?: number;
  timelineScrollSec?: number;
  selection?: { inSeconds?: number; outSeconds?: number };
};

function clipDurationSec(chapter: EditorialChapterRow): number {
  const span = chapter.endSec - chapter.startSec;
  if (span > 0) return span;
  return Math.max(chapter.durationSec, MIN_CLIP_SEC_FALLBACK);
}

function readStoredZoom(): number {
  if (typeof window === "undefined") return MAGNETIC_ZOOM_DEFAULT;
  const raw = sessionStorage.getItem(ZOOM_STORAGE_KEY);
  const n = raw != null ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return MAGNETIC_ZOOM_DEFAULT;
  return Math.max(MAGNETIC_ZOOM_MIN, Math.min(MAGNETIC_ZOOM_MAX, n));
}

function thumbTileCount(widthPx: number): number {
  if (widthPx < 64) return 1;
  return Math.min(8, Math.max(1, Math.floor(widthPx / THUMB_TILE_WIDTH_PX)));
}

function thumbUrlsForClip(
  set: ChapterThumbSet | undefined,
  tileCount: number,
): string[] {
  if (!set) return [];
  const frames = [set.first.url, set.mid.url, set.last.url];
  if (tileCount <= 1) return [set.mid.url];
  return Array.from({ length: tileCount }, (_, i) => {
    if (tileCount === 1) return frames[1];
    const t = i / (tileCount - 1);
    if (t <= 0.2) return frames[0];
    if (t >= 0.8) return frames[2];
    return frames[1];
  });
}

type StatusBadge = "queued" | "rejected" | "accepted" | null;

function statusBadge(
  chapter: EditorialChapterRow,
  titleAcceptedIds: Record<string, boolean>,
): StatusBadge {
  if (chapter.reviewStatus === "Reject") return "rejected";
  if (chapter.reviewStatus === "Keep") return "queued";
  if (titleAcceptedIds[chapter.id]) return "accepted";
  return null;
}

function badgeLabel(badge: StatusBadge): string | null {
  if (badge === "queued") return "Q";
  if (badge === "rejected") return "×";
  if (badge === "accepted") return "✓";
  return null;
}

function magneticClipClass(
  chapter: EditorialChapterRow,
  isActive: boolean,
  isFlashing: boolean,
  isSearchHit: boolean,
  titleAcceptedIds: Record<string, boolean>,
): string {
  const parts = ["ops-ml-magnetic-clip"];
  if (isActive) parts.push("ops-ml-magnetic-clip--active");
  if (isSearchHit) parts.push("ops-ml-magnetic-clip--search-hit");
  if (chapter.favorite) parts.push("ops-ml-magnetic-clip--favorite");
  if (chapter.reviewStatus === "Keep") parts.push("ops-ml-magnetic-clip--keep");
  if (chapter.reviewStatus === "Reject") parts.push("ops-ml-magnetic-clip--reject");
  if (titleAcceptedIds[chapter.id] && chapter.reviewStatus !== "Keep") {
    parts.push("ops-ml-magnetic-clip--accepted");
  }
  if (chapter.durationSec < SHORT_CHAPTER_SEC) parts.push("ops-ml-magnetic-clip--short");
  if (isFlashing) parts.push("ops-ml-magnetic-clip--flash");
  return parts.join(" ");
}

function itemClass(
  chapter: EditorialChapterRow,
  isActive: boolean,
  isFlashing: boolean,
  titleAcceptedIds: Record<string, boolean>,
  harvest = false,
): string {
  const parts = ["ops-ml-queue-strip__item"];
  if (harvest) parts.push("ops-ml-harvest-cell");
  if (isActive) parts.push(harvest ? "ops-ml-harvest-cell--active" : "ops-ml-queue-strip__item--active");
  if (chapter.favorite) parts.push("ops-ml-queue-strip__item--favorite");
  if (chapter.reviewStatus === "Keep") parts.push("ops-ml-queue-strip__item--keep");
  if (chapter.reviewStatus === "Reject") parts.push("ops-ml-queue-strip__item--reject");
  if (titleAcceptedIds[chapter.id] && chapter.reviewStatus !== "Keep") {
    parts.push("ops-ml-harvest-cell--accepted");
  }
  if (chapter.durationSec < SHORT_CHAPTER_SEC) {
    parts.push("ops-ml-queue-strip__item--short");
  }
  if (isFlashing) parts.push("ops-ml-queue-strip__item--flash");
  return parts.join(" ");
}

function MagneticMergeHandle(props: {
  leftIndex: number;
  onMerge?: (boundaryIndex: number) => void;
}) {
  if (!props.onMerge) return null;
  return (
    <button
      type="button"
      className="ops-ml-magnetic-merge"
      style={{ width: MERGE_HANDLE_WIDTH_PX, flex: `0 0 ${MERGE_HANDLE_WIDTH_PX}px` }}
      aria-label={`Merge clips ${props.leftIndex + 1} and ${props.leftIndex + 2}`}
      title="Double-click to merge these clips"
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.onMerge?.(props.leftIndex);
      }}
    >
      <span className="ops-ml-magnetic-merge__glyph" aria-hidden="true">
        ║
      </span>
    </button>
  );
}

/** Scroll only when the clip is partially off-screen — never re-center the timeline. */
function scrollClipIntoViewIfNeeded(
  container: HTMLDivElement,
  element: HTMLElement,
  margin = 12,
): void {
  const c = container.getBoundingClientRect();
  const e = element.getBoundingClientRect();
  if (e.left >= c.left + margin && e.right <= c.right - margin) return;
  if (e.left < c.left + margin) {
    container.scrollLeft -= c.left + margin - e.left;
  } else if (e.right > c.right - margin) {
    container.scrollLeft += e.right - (c.right - margin);
  }
}

function MagneticTimeline(props: ClipQueueFilmstripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const clipRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevScrollMaxRef = useRef(0);
  const [zoom, setZoom] = useState(readStoredZoom);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrollMetrics, setScrollMetrics] = useState({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
  });
  const pxPerSec = props.pxPerSec ?? zoom;
  const titleAcceptedIds = props.titleAcceptedIds ?? {};
  const flashSet = useMemo(() => new Set(props.flashIds ?? []), [props.flashIds]);
  const playheadSec = props.playheadSec ?? 0;
  const showDurationSec = Math.max(
    props.showDurationSec ?? 0,
    props.chapters.at(-1)?.endSec ?? 0,
    1,
  );

  const listChapters = useMemo(
    () => props.chapters.map((chapter, index) => ({ chapter, index })),
    [props.chapters],
  );

  const trackWidthPx = useMemo(
    () => magneticTrackWidthPx(props.chapters, pxPerSec),
    [props.chapters, pxPerSec],
  );

  const playheadX = useMemo(
    () => sourceSecToMagneticX(playheadSec, props.chapters, pxPerSec),
    [playheadSec, props.chapters, pxPerSec],
  );

  const viewportSource = useMemo(
    () =>
      visibleSourceRange(
        scrollMetrics.scrollLeft,
        scrollMetrics.clientWidth,
        props.chapters,
        pxPerSec,
      ),
    [scrollMetrics.clientWidth, scrollMetrics.scrollLeft, props.chapters, pxPerSec],
  );

  const searchQuery = props.searchQuery ?? "";
  const searchHits = props.searchHits ?? [];
  const searchHitIds = useMemo(() => searchHitChapterIds(searchHits), [searchHits]);

  const setClipRef = (id: string, el: HTMLDivElement | null) => {
    if (el) clipRefs.current.set(id, el);
    else clipRefs.current.delete(id);
  };

  const updateScrollMetrics = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setScrollMetrics({
      scrollLeft: el.scrollLeft,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    });
  }, []);

  useEffect(() => {
    const container = stripRef.current;
    const id = props.activeId;
    if (!container || !id) return;
    const el = clipRefs.current.get(id);
    if (!el) return;
    scrollClipIntoViewIfNeeded(container, el);
    updateScrollMetrics();
  }, [props.activeId, updateScrollMetrics]);

  useEffect(() => {
    const container = stripRef.current;
    if (!container) return;
    updateScrollMetrics();
    const ro = new ResizeObserver(updateScrollMetrics);
    ro.observe(container);
    return () => ro.disconnect();
  }, [trackWidthPx, updateScrollMetrics]);

  useEffect(() => {
    const container = stripRef.current;
    if (!container) return;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    if (prevScrollMaxRef.current <= 0) {
      prevScrollMaxRef.current = maxScroll;
      return;
    }
    if (prevScrollMaxRef.current === maxScroll) return;
    const ratio =
      prevScrollMaxRef.current > 0 ? container.scrollLeft / prevScrollMaxRef.current : 0;
    requestAnimationFrame(() => {
      if (!stripRef.current) return;
      const nextMax = Math.max(0, stripRef.current.scrollWidth - stripRef.current.clientWidth);
      stripRef.current.scrollLeft = ratio * nextMax;
      prevScrollMaxRef.current = nextMax;
      updateScrollMetrics();
    });
  }, [trackWidthPx, updateScrollMetrics]);

  useEffect(() => {
    const track = stripRef.current;
    if (!track) return;
    function onWheel(e: WheelEvent) {
      const t = stripRef.current;
      if (!t) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      t.scrollLeft += e.deltaY;
    }
    track.addEventListener("wheel", onWheel, { passive: false });
    return () => track.removeEventListener("wheel", onWheel);
  }, []);

  function onZoomInput(value: number) {
    const next = Math.max(MAGNETIC_ZOOM_MIN, Math.min(MAGNETIC_ZOOM_MAX, value));
    setZoom(next);
    try {
      sessionStorage.setItem(ZOOM_STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }

  function setZoomLevel(next: number) {
    onZoomInput(next);
  }

  function fitSelection() {
    const selection = props.selection;
    if (selection?.inSeconds == null || selection.outSeconds == null) return;
    const span = Math.max(1, selection.outSeconds - selection.inSeconds);
    const viewport = stripRef.current?.clientWidth ?? 720;
    setZoomLevel(Math.max(MAGNETIC_ZOOM_MIN, Math.min(MAGNETIC_ZOOM_MAX, viewport / span)));
    handleMinimapNavigate(selection.inSeconds);
  }

  const sourceAtClientX = useCallback(
    (clientX: number) => {
      const track = stripRef.current;
      const inner = track?.querySelector<HTMLElement>(".ops-ml-magnetic-timeline__track-inner");
      if (!inner) return 0;
      return magneticXToSourceSec(clientX - inner.getBoundingClientRect().left, props.chapters, pxPerSec);
    },
    [props.chapters, pxPerSec],
  );

  useEffect(() => {
    if (!scrubbing) return;
    const move = (event: PointerEvent) => props.onSeek?.(sourceAtClientX(event.clientX));
    const up = () => setScrubbing(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [props.onSeek, scrubbing, sourceAtClientX]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.metaKey || event.ctrlKey) && event.key === "+") {
        event.preventDefault();
        setZoomLevel(zoom + 2);
      } else if ((event.metaKey || event.ctrlKey) && event.key === "-") {
        event.preventDefault();
        setZoomLevel(zoom - 2);
      } else if (event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setZoomLevel(MAGNETIC_ZOOM_MIN);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  function handleTrackScroll() {
    updateScrollMetrics();
  }

  function handleScrollbarScroll(scrollLeft: number) {
    const el = stripRef.current;
    if (!el) return;
    el.scrollLeft = scrollLeft;
    updateScrollMetrics();
  }

  function handleMinimapNavigate(sec: number) {
    props.onSeek?.(sec);
    const x = sourceSecToMagneticX(sec, props.chapters, pxPerSec);
    const el = stripRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, x - el.clientWidth * 0.5);
    updateScrollMetrics();
  }

  useEffect(() => {
    if (!props.timelineScrollToken || props.timelineScrollSec == null) return;
    handleMinimapNavigate(props.timelineScrollSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll on token only
  }, [props.timelineScrollToken]);

  return (
    <section className="ops-ml-magnetic-timeline" aria-label="Magnetic chapter timeline">
      <div className="ops-ml-magnetic-timeline__toolbar">
        <span className="ops-ml-magnetic-timeline__zoom-label">Overview</span>
        <button type="button" className="ops-btn ops-btn--sm" aria-label="Zoom Out" onClick={() => setZoomLevel(zoom - 2)}>
          −
        </button>
        <input
          type="range"
          className="ops-ml-magnetic-timeline__zoom"
          min={MAGNETIC_ZOOM_MIN}
          max={MAGNETIC_ZOOM_MAX}
          step={1}
          value={pxPerSec}
          aria-label="Timeline zoom"
          aria-valuetext={`${pxPerSec} pixels per second`}
          onChange={(e) => onZoomInput(Number(e.target.value))}
        />
        <span className="ops-ml-magnetic-timeline__zoom-label">Detail</span>
        <span className="ops-ml-magnetic-timeline__zoom-readout" aria-hidden="true">
          {pxPerSec}px/s
        </span>
        <button type="button" className="ops-btn ops-btn--sm" aria-label="Zoom In" onClick={() => setZoomLevel(zoom + 2)}>
          +
        </button>
        <button type="button" className="ops-btn ops-btn--sm" onClick={() => setZoomLevel(MAGNETIC_ZOOM_MIN)}>
          Fit Entire Source
        </button>
        <button type="button" className="ops-btn ops-btn--sm" onClick={fitSelection} disabled={props.selection?.inSeconds == null || props.selection?.outSeconds == null}>
          Fit Selection
        </button>
        <TimelineTranscriptSearch
          query={searchQuery}
          matchCount={searchHits.length}
          onQueryChange={(q) => props.onSearchQueryChange?.(q)}
          onNavigate={props.onSearchNavigate}
        />
      </div>

      <MagneticTimelineMinimap
        chapters={props.chapters}
        showDurationSec={showDurationSec}
        playheadSec={playheadSec}
        viewportStartSec={viewportSource.startSec}
        viewportEndSec={viewportSource.endSec}
        searchHits={searchHits}
        searchHitIds={searchHitIds}
        onNavigate={handleMinimapNavigate}
      />

      <div className="ops-ml-magnetic-timeline__viewport">
        <div
          ref={stripRef}
          className="ops-ml-magnetic-timeline__track"
          role="list"
          onScroll={handleTrackScroll}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            event.preventDefault();
            setScrubbing(true);
            props.onSeek?.(sourceAtClientX(event.clientX));
          }}
        >
          <div
            className="ops-ml-magnetic-timeline__track-inner"
            style={{ width: trackWidthPx }}
          >
            {playheadSec >= 0 ? (
              <div
                className="ops-ml-magnetic-timeline__playhead"
                style={{ left: playheadX }}
                aria-hidden
              />
            ) : null}
        {listChapters.flatMap(({ chapter, index }) => {
          const widthPx = clipWidthPx(chapter, pxPerSec);
          const thumbSet = props.thumbs[chapter.id];
          const tiles = thumbUrlsForClip(thumbSet, thumbTileCount(widthPx));
          const isActive = chapter.id === props.activeId;
          const isFlashing = flashSet.has(chapter.id);
          const isSearchHit = searchHitIds.has(chapter.id);
          const badge = statusBadge(chapter, titleAcceptedIds);
          const badgeText = badgeLabel(badge);
          const dur = Math.round(clipDurationSec(chapter));

          const mergeEl =
            index > 0 ? (
              <MagneticMergeHandle
                key={`merge-${chapter.id}`}
                leftIndex={index - 1}
                onMerge={props.onMergeBoundary}
              />
            ) : null;

          const clipEl = (
            <div
              key={chapter.id}
              ref={(el) => setClipRef(chapter.id, el)}
              className="ops-ml-magnetic-timeline__clip-wrap"
              style={{ width: widthPx, flex: `0 0 ${widthPx}px` }}
            >
              {props.onDeleteChapter ? (
                <button
                  type="button"
                  className="ops-ml-magnetic-clip__delete"
                  aria-label={`Delete ${chapter.title}`}
                  title="Delete clip"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onDeleteChapter?.(chapter.id);
                  }}
                >
                  ×
                </button>
              ) : null}
              <button
                type="button"
                role="listitem"
                className={magneticClipClass(
                  chapter,
                  isActive,
                  isFlashing,
                  isSearchHit,
                  titleAcceptedIds,
                )}
                title={`#${index + 1} · ${chapter.title} · ${dur}s · ${chapter.clock ?? ""}`}
                onClick={() => props.onSelect(chapter)}
                onDoubleClick={(e) => {
                  if (!isActive || !props.onSplitAtPlayhead) return;
                  e.preventDefault();
                  e.stopPropagation();
                  props.onSplitAtPlayhead();
                }}
              >
                <span
                  className="ops-ml-magnetic-clip__thumbs"
                  style={{ height: MAGNETIC_THUMB_HEIGHT_PX }}
                >
                  {tiles.length > 0
                    ? tiles.map((url, ti) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${chapter.id}-${ti}`}
                          className="ops-ml-magnetic-clip__thumb-tile"
                          src={url}
                          alt=""
                          loading="lazy"
                          draggable={false}
                        />
                      ))
                    : props.thumbsLoading
                      ? Array.from({ length: Math.max(1, thumbTileCount(widthPx)) }).map(
                          (_, ti) => (
                            <span
                              key={ti}
                              className="ops-ml-magnetic-clip__thumb-tile ops-ml-magnetic-clip__thumb-tile--empty"
                            >
                              …
                            </span>
                          ),
                        )
                      : Array.from({ length: Math.max(1, thumbTileCount(widthPx)) }).map(
                          (_, ti) => (
                            <span
                              key={ti}
                              className="ops-ml-magnetic-clip__thumb-tile ops-ml-magnetic-clip__thumb-tile--empty"
                            >
                              —
                            </span>
                          ),
                        )}
                </span>
                {badgeText ? (
                  <span
                    className={`ops-ml-magnetic-clip__badge ops-ml-magnetic-clip__badge--${badge}`}
                    aria-label={
                      badge === "queued"
                        ? "Queued"
                        : badge === "rejected"
                          ? "Rejected"
                          : "Accepted"
                    }
                  >
                    {badgeText}
                  </span>
                ) : null}
                {chapter.favorite ? (
                  <span className="ops-ml-magnetic-clip__favorite" aria-label="Favorite">
                    ★
                  </span>
                ) : null}
                {chapter.durationSec < SHORT_CHAPTER_SEC ? (
                  <span
                    className="ops-ml-magnetic-clip__short"
                    title="Short clip (&lt; 5s)"
                    aria-label="Short clip"
                  />
                ) : null}
                <span className="ops-ml-magnetic-clip__index">{index + 1}</span>
              </button>
            </div>
          );

          return mergeEl ? [mergeEl, clipEl] : [clipEl];
        })}
          </div>
        </div>
      </div>

      <MagneticTimelineScrollbar
        scrollLeft={scrollMetrics.scrollLeft}
        scrollWidth={scrollMetrics.scrollWidth}
        clientWidth={scrollMetrics.clientWidth}
        onScroll={handleScrollbarScroll}
      />
    </section>
  );
}

export function ClipQueueFilmstrip(props: ClipQueueFilmstripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const layout = props.layout ?? "magnetic";
  const pxPerSec = props.pxPerSec ?? TIMELINE_PX_PER_SEC;
  const titleAcceptedIds = props.titleAcceptedIds ?? {};
  const flashSet = useMemo(() => new Set(props.flashIds ?? []), [props.flashIds]);

  const activeIndex = useMemo(
    () => props.chapters.findIndex((c) => c.id === props.activeId),
    [props.activeId, props.chapters],
  );

  const listChapters = useMemo(() => {
    if (
      layout === "filmstrip" ||
      layout === "harvest" ||
      layout === "magnetic" ||
      layout === "sidebar"
    ) {
      return props.chapters.map((chapter, index) => ({ chapter, index }));
    }
    if (props.chapters.length === 0) return [];
    const half = Math.floor(WINDOW_SIZE / 2);
    let start = Math.max(0, activeIndex - half);
    let end = Math.min(props.chapters.length, start + WINDOW_SIZE);
    if (end - start < WINDOW_SIZE) {
      start = Math.max(0, end - WINDOW_SIZE);
    }
    return props.chapters.slice(start, end).map((chapter, offset) => ({
      chapter,
      index: start + offset,
    }));
  }, [activeIndex, layout, props.chapters]);

  const trackWidthPx = useMemo(() => {
    if (layout === "harvest") {
      return listChapters.length * HARVEST_CELL_WIDTH_PX;
    }
    if (layout !== "filmstrip") return undefined;
    return listChapters.reduce(
      (sum, { chapter }) => sum + clipWidthPx(chapter, pxPerSec),
      0,
    );
  }, [layout, listChapters, pxPerSec]);

  useEffect(() => {
    if (layout === "magnetic") return;
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [layout, props.activeId]);

  if (layout === "magnetic") {
    return <MagneticTimeline {...props} />;
  }

  const rootClass = [
    "ops-ml-queue-strip",
    layout === "filmstrip" ? "ops-ml-queue-strip--filmstrip" : "",
    layout === "harvest" ? "ops-ml-queue-strip--harvest" : "",
    layout === "sidebar" ? "ops-ml-queue-strip--sidebar" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (layout === "harvest") {
    return (
      <section className={rootClass} aria-label="Clip harvest strip">
        <div
          ref={stripRef}
          className="ops-ml-harvest-strip__track"
          role="list"
          style={trackWidthPx != null ? { minWidth: trackWidthPx } : undefined}
        >
          {listChapters.map(({ chapter, index }) => {
            const thumb = props.thumbs[chapter.id]?.mid.url;
            const isActive = chapter.id === props.activeId;
            const isFlashing = flashSet.has(chapter.id);
            const badge = statusBadge(chapter, titleAcceptedIds);
            const badgeText = badgeLabel(badge);
            return (
              <button
                key={chapter.id}
                ref={isActive ? activeRef : undefined}
                type="button"
                role="listitem"
                className={itemClass(chapter, isActive, isFlashing, titleAcceptedIds, true)}
                style={{ width: HARVEST_CELL_WIDTH_PX, flex: `0 0 ${HARVEST_CELL_WIDTH_PX}px` }}
                title={`#${index + 1} · ${chapter.title} · ${Math.round(clipDurationSec(chapter))}s · ${chapter.clock ?? ""}`}
                onClick={() => props.onSelect(chapter)}
              >
                <span
                  className="ops-ml-harvest-cell__frame"
                  style={{ height: HARVEST_THUMB_HEIGHT_PX }}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="ops-ml-harvest-cell__img" src={thumb} alt="" loading="lazy" />
                  ) : props.thumbsLoading ? (
                    <span className="ops-ml-harvest-cell__placeholder">…</span>
                  ) : (
                    <span className="ops-ml-harvest-cell__placeholder">—</span>
                  )}
                  {badgeText ? (
                    <span
                      className={`ops-ml-harvest-cell__badge ops-ml-harvest-cell__badge--${badge}`}
                    >
                      {badgeText}
                    </span>
                  ) : null}
                  {chapter.favorite ? (
                    <span className="ops-ml-harvest-cell__favorite" aria-label="Favorite">
                      ★
                    </span>
                  ) : null}
                  <span className="ops-ml-harvest-cell__index">{index + 1}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (layout === "filmstrip") {
    return (
      <section className={rootClass} aria-label="Chapter filmstrip">
        <div
          ref={stripRef}
          className="ops-ml-queue-strip__track ops-ml-queue-strip__track--filmstrip"
          role="list"
          style={trackWidthPx != null ? { minWidth: trackWidthPx } : undefined}
        >
          {listChapters.map(({ chapter, index }) => {
            const thumb = props.thumbs[chapter.id]?.mid.url;
            const isActive = chapter.id === props.activeId;
            const isFlashing = flashSet.has(chapter.id);
            const widthPx = clipWidthPx(chapter, pxPerSec);
            return (
              <div
                key={chapter.id}
                className="ops-ml-filmstrip-clip"
                style={{ width: widthPx, flex: `0 0 ${widthPx}px` }}
                role="presentation"
              >
                {index > 0 && props.onMergeBoundary ? (
                  <div
                    role="separator"
                    className="ops-ml-filmstrip-boundary"
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      props.onMergeBoundary?.(index - 1);
                    }}
                  />
                ) : null}
                <button
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  role="listitem"
                  className={itemClass(chapter, isActive, isFlashing, titleAcceptedIds)}
                  onClick={() => props.onSelect(chapter)}
                >
                  <span className="ops-ml-queue-strip__frame ops-ml-queue-strip__frame--filmstrip">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="ops-ml-queue-strip__img" src={thumb} alt="" loading="lazy" />
                    ) : (
                      <span className="ops-ml-queue-strip__placeholder">—</span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={rootClass} aria-label="Clip queue">
      <div ref={stripRef} className="ops-ml-queue-strip__track" role="list">
        {listChapters.map(({ chapter, index }) => {
          const thumb = props.thumbs[chapter.id]?.mid.url;
          const isActive = chapter.id === props.activeId;
          return (
            <button
              key={chapter.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="listitem"
              className={itemClass(chapter, isActive, flashSet.has(chapter.id), titleAcceptedIds)}
              onClick={() => props.onSelect(chapter)}
            >
              <span className="ops-ml-queue-strip__frame">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ops-ml-queue-strip__img" src={thumb} alt="" loading="lazy" />
                ) : (
                  <span className="ops-ml-queue-strip__placeholder">—</span>
                )}
              </span>
              <span className="ops-ml-queue-strip__num">{index + 1}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
