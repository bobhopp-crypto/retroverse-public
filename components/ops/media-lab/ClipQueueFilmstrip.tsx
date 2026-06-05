"use client";

import { useEffect, useMemo, useRef } from "react";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import type { ChapterThumbSet } from "./ChapterThumbTriplet";

const WINDOW_SIZE = 15;

type ClipQueueFilmstripProps = {
  chapters: EditorialChapterRow[];
  activeId: string | null;
  thumbs: Record<string, ChapterThumbSet>;
  thumbsLoading: boolean;
  onSelect: (chapter: EditorialChapterRow) => void;
  /** horizontal = bottom filmstrip; sidebar = vertical queue rail */
  layout?: "horizontal" | "sidebar";
  queueCount?: number;
};

function itemClass(chapter: EditorialChapterRow, isActive: boolean): string {
  const parts = ["ops-ml-queue-strip__item"];
  if (isActive) parts.push("ops-ml-queue-strip__item--active");
  if (chapter.favorite) parts.push("ops-ml-queue-strip__item--favorite");
  else if (chapter.reviewStatus === "Keep") parts.push("ops-ml-queue-strip__item--keep");
  return parts.join(" ");
}

export function ClipQueueFilmstrip(props: ClipQueueFilmstripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const layout = props.layout ?? "horizontal";

  const activeIndex = useMemo(
    () => props.chapters.findIndex((c) => c.id === props.activeId),
    [props.activeId, props.chapters],
  );

  const listChapters = useMemo(() => {
    if (layout === "sidebar") {
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

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: layout === "sidebar" ? "nearest" : "center",
    });
  }, [layout, props.activeId]);

  const rootClass =
    layout === "sidebar"
      ? "ops-ml-queue-strip ops-ml-queue-strip--sidebar"
      : "ops-ml-queue-strip";

  return (
    <section className={rootClass} aria-label="Clip queue">
      <header className="ops-ml-queue-strip__head">
        <span className="ops-ml-queue-strip__icon" aria-hidden="true">
          🎞
        </span>
        <h4 className="ops-ml-queue-strip__label">
          {layout === "sidebar" ? "Queue" : "Clip queue"}
        </h4>
        {layout === "sidebar" && props.queueCount != null ? (
          <span className="ops-ml-queue-strip__count">{props.queueCount} clips</span>
        ) : null}
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
              className={itemClass(chapter, isActive)}
              title={`Clip ${index + 1}${chapter.favorite ? " · Favorite" : chapter.reviewStatus === "Keep" ? " · Kept" : ""}: ${chapter.title}`}
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
              <span className="ops-ml-queue-strip__meta">
                <span className="ops-ml-queue-strip__num">{index + 1}</span>
                {layout === "sidebar" ? (
                  <span className="ops-ml-queue-strip__title">{chapter.title}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
