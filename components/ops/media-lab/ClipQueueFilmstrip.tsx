"use client";

import { useEffect, useMemo, useRef } from "react";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import type { ClipReviewStatus } from "@/lib/ops/media-lab/editorial/review-status";

import type { ChapterThumbSet } from "./ChapterThumbTriplet";

const WINDOW_SIZE = 15;

type ClipQueueFilmstripProps = {
  chapters: EditorialChapterRow[];
  activeId: string | null;
  thumbs: Record<string, ChapterThumbSet>;
  thumbsLoading: boolean;
  onSelect: (chapter: EditorialChapterRow) => void;
};

function statusClass(status?: ClipReviewStatus): string {
  if (status === "Keep") return " ops-ml-queue-strip__item--keep";
  if (status === "Reject") return " ops-ml-queue-strip__item--reject";
  return "";
}

export function ClipQueueFilmstrip(props: ClipQueueFilmstripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const activeIndex = useMemo(
    () => props.chapters.findIndex((c) => c.id === props.activeId),
    [props.activeId, props.chapters],
  );

  const windowChapters = useMemo(() => {
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
  }, [activeIndex, props.chapters]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [props.activeId]);

  return (
    <section className="ops-ml-queue-strip" aria-label="Clip filmstrip">
      <header className="ops-ml-queue-strip__head">
        <span className="ops-ml-queue-strip__icon" aria-hidden="true">
          🎞
        </span>
        <h4 className="ops-ml-queue-strip__label">Clip queue</h4>
      </header>
      <div ref={stripRef} className="ops-ml-queue-strip__track" role="list">
        {windowChapters.map(({ chapter, index }) => {
          const thumb = props.thumbs[chapter.id]?.mid.url;
          const isActive = chapter.id === props.activeId;
          return (
            <button
              key={chapter.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="listitem"
              className={`ops-ml-queue-strip__item${isActive ? " ops-ml-queue-strip__item--active" : ""}${statusClass(chapter.reviewStatus)}`}
              title={`Clip ${index + 1}: ${chapter.title}`}
              onClick={() => props.onSelect(chapter)}
            >
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
