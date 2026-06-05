"use client";

import { useEffect, useMemo, useRef } from "react";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import type { ChapterThumbSet } from "./ChapterThumbTriplet";

const WINDOW_SIZE = 15;
const SHORT_CHAPTER_SEC = 5;
/** Fixed scale — clip width = duration × px/sec (stable across merge/delete). */
export const TIMELINE_PX_PER_SEC = 7;
const MIN_CLIP_WIDTH_PX = 52;
const MIN_CLIP_SEC_FALLBACK = 1;

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
  /** horizontal = legacy; filmstrip = full-width chapter nav; sidebar = deprecated */
  layout?: "horizontal" | "filmstrip" | "sidebar";
  queueCount?: number;
};

function clipDurationSec(chapter: EditorialChapterRow): number {
  const span = chapter.endSec - chapter.startSec;
  if (span > 0) return span;
  return Math.max(chapter.durationSec, MIN_CLIP_SEC_FALLBACK);
}

function clipWidthPx(chapter: EditorialChapterRow, pxPerSec: number): number {
  return Math.max(MIN_CLIP_WIDTH_PX, Math.round(clipDurationSec(chapter) * pxPerSec));
}

function itemClass(
  chapter: EditorialChapterRow,
  isActive: boolean,
  isFlashing: boolean,
): string {
  const parts = ["ops-ml-queue-strip__item"];
  if (isActive) parts.push("ops-ml-queue-strip__item--active");
  if (chapter.favorite) parts.push("ops-ml-queue-strip__item--favorite");
  else if (chapter.reviewStatus === "Keep") parts.push("ops-ml-queue-strip__item--keep");
  if (chapter.durationSec < SHORT_CHAPTER_SEC) {
    parts.push("ops-ml-queue-strip__item--short");
  }
  if (isFlashing) parts.push("ops-ml-queue-strip__item--flash");
  return parts.join(" ");
}

export function ClipQueueFilmstrip(props: ClipQueueFilmstripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const layout = props.layout ?? "filmstrip";
  const pxPerSec = props.pxPerSec ?? TIMELINE_PX_PER_SEC;
  const flashSet = useMemo(() => new Set(props.flashIds ?? []), [props.flashIds]);

  const activeIndex = useMemo(
    () => props.chapters.findIndex((c) => c.id === props.activeId),
    [props.activeId, props.chapters],
  );

  const listChapters = useMemo(() => {
    if (layout === "filmstrip" || layout === "sidebar") {
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
    if (layout !== "filmstrip") return undefined;
    return listChapters.reduce(
      (sum, { chapter }) => sum + clipWidthPx(chapter, pxPerSec),
      0,
    );
  }, [layout, listChapters, pxPerSec]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [props.activeId]);

  const rootClass = [
    "ops-ml-queue-strip",
    layout === "filmstrip" ? "ops-ml-queue-strip--filmstrip" : "",
    layout === "sidebar" ? "ops-ml-queue-strip--sidebar" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
                    aria-label={`Merge chapters ${index} and ${index + 1}`}
                    className="ops-ml-filmstrip-boundary"
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      props.onMergeBoundary?.(index - 1);
                    }}
                  />
                ) : null}
                {props.onDeleteChapter ? (
                  <button
                    type="button"
                    className="ops-ml-filmstrip-delete"
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
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  role="listitem"
                  className={itemClass(chapter, isActive, isFlashing)}
                  title={`${chapter.title} · ${Math.round(clipDurationSec(chapter))}s`}
                  onClick={() => props.onSelect(chapter)}
                  onDoubleClick={(e) => {
                    if (!isActive || !props.onSplitAtPlayhead) return;
                    e.preventDefault();
                    e.stopPropagation();
                    props.onSplitAtPlayhead();
                  }}
                >
                  {chapter.durationSec < SHORT_CHAPTER_SEC ? (
                    <span
                      className="ops-ml-queue-strip__short-warning"
                      title="Short chapter (< 5s)"
                      aria-label="Short chapter warning"
                    />
                  ) : null}
                  <span className="ops-ml-queue-strip__frame ops-ml-queue-strip__frame--filmstrip">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="ops-ml-queue-strip__img" src={thumb} alt="" loading="lazy" />
                    ) : props.thumbsLoading ? (
                      <span className="ops-ml-queue-strip__placeholder">…</span>
                    ) : (
                      <span className="ops-ml-queue-strip__placeholder">—</span>
                    )}
                  </span>
                  <span className="ops-ml-queue-strip__filmstrip-meta">
                    <span className="ops-ml-queue-strip__clock">{chapter.clock}</span>
                    <span className="ops-ml-queue-strip__filmstrip-title">{chapter.title}</span>
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
      <header className="ops-ml-queue-strip__head">
        <span className="ops-ml-queue-strip__icon" aria-hidden="true">
          🎞
        </span>
        <h4 className="ops-ml-queue-strip__label">Clip queue</h4>
      </header>
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
              className={itemClass(chapter, isActive, flashSet.has(chapter.id))}
              title={chapter.title}
              onClick={() => props.onSelect(chapter)}
            >
              {chapter.favorite ? (
                <span className="ops-ml-queue-strip__badge" aria-hidden="true">
                  ⭐
                </span>
              ) : null}
              <span className="ops-ml-queue-strip__frame">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ops-ml-queue-strip__img" src={thumb} alt="" loading="lazy" />
                ) : props.thumbsLoading ? (
                  <span className="ops-ml-queue-strip__placeholder">…</span>
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
