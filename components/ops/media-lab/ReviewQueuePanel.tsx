"use client";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";

import type { ChapterThumbSet } from "./ChapterThumbTriplet";

function formatQueueDuration(ch: EditorialChapterRow): string {
  const sec = ch.lengthSeconds ?? Math.round(ch.durationSec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type ReviewQueuePanelProps = {
  items: EditorialChapterRow[];
  thumbs: Record<string, ChapterThumbSet>;
  thumbsLoading: boolean;
  onSelect: (chapter: EditorialChapterRow) => void;
  onRemove: (chapterId: string) => void;
};

export function ReviewQueuePanel(props: ReviewQueuePanelProps) {
  return (
    <section className="ops-ml-review-queue" aria-label="Acquisition queue">
      <header className="ops-ml-review-queue__head">
        <h4 className="ops-ml-review-queue__label">Queue</h4>
        <span className="ops-ml-review-queue__count">{props.items.length} clips</span>
      </header>
      <div className="ops-ml-review-queue__list" role="list">
        {props.items.length === 0 ? (
          <p className="ops-ml-review-queue__empty">No clips queued yet.</p>
        ) : (
          props.items.map((chapter, index) => {
            const thumb = props.thumbs[chapter.id]?.mid.url;
            return (
              <article key={chapter.id} className="ops-ml-review-queue__item" role="listitem">
                <button
                  type="button"
                  className="ops-ml-review-queue__main"
                  onClick={() => props.onSelect(chapter)}
                >
                  <span className="ops-ml-review-queue__num">{index + 1}</span>
                  <span className="ops-ml-review-queue__thumb">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" loading="lazy" />
                    ) : props.thumbsLoading ? (
                      "…"
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="ops-ml-review-queue__meta">
                    <span className="ops-ml-review-queue__title">{chapter.title}</span>
                    <span className="ops-ml-review-queue__category">
                      {chapter.category ?? "Uncategorized"}
                    </span>
                    <span className="ops-ml-review-queue__duration">
                      {formatQueueDuration(chapter)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="ops-ml-review-queue__remove"
                  title="Remove from queue"
                  aria-label={`Remove ${chapter.title} from queue`}
                  onClick={() => props.onRemove(chapter.id)}
                >
                  ×
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
