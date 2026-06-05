"use client";

import { useEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from "react";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";

import type { ChapterThumbSet } from "./ChapterThumbTriplet";
import { ClipQueueFilmstrip } from "./ClipQueueFilmstrip";
import { ClipSelectionPanel, type ClipSelectionState } from "./ClipSelectionPanel";
import { CuratorClassificationPanel } from "./CuratorClassificationPanel";
import type { CuratorCategory } from "./curator-categories";
import { ReviewQueuePanel } from "./ReviewQueuePanel";

type FocusReviewDeckProps = {
  showTitle: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  onTimeUpdate: () => void;
  clip: EditorialChapterRow;
  playheadSec: number;
  selection: ClipSelectionState;
  onSelectionChange: (next: ClipSelectionState) => void;
  onSeek: (sec: number) => void;
  onTrimDragStart?: () => void;
  onTrimPreview?: (sec: number) => void;
  onTrimDragEnd?: (sec: number) => void;
  onTitleChange: (title: string) => void;
  onRegenerateTitle: () => void;
  previewIndex: number;
  totalClips: number;
  kept: number;
  isFavorite: boolean;
  onFavoriteClip: () => void;
  onAcceptSuggestion: () => void;
  onCategorize: (category: CuratorCategory) => void;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
  chapters: EditorialChapterRow[];
  chapterThumbs: Record<string, ChapterThumbSet>;
  thumbsLoading: boolean;
  onSelectClip: (chapter: EditorialChapterRow) => void;
  onRemoveFromQueue: (chapterId: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onToggleFocus: () => void;
  onOpenSetup?: () => void;
  onMergeBoundary?: (boundaryIndex: number) => void;
  onSplitAtPlayhead?: () => void;
  advancedPanel: ReactNode;
};

export function FocusReviewDeck(props: FocusReviewDeckProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const activeThumbs = props.chapterThumbs[props.clip.id] ?? null;

  const queueItems = useMemo(
    () => props.chapters.filter((ch) => ch.reviewStatus === "Keep"),
    [props.chapters],
  );

  useEffect(() => {
    const input = titleRef.current;
    if (!input) return;
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }, [props.clip.id]);

  return (
    <div className="ops-ml-deck ops-ml-deck--review">
      <header className="ops-ml-review__topbar">
        <div className="ops-ml-review__brand">
          <span className="ops-ml-review__brand-mark" aria-hidden="true">
            ▶
          </span>
          <span className="ops-ml-review__brand-text">
            RETROVERSE <strong>MEDIA LAB</strong>
          </span>
        </div>
        <h1 className="ops-ml-review__source">{props.showTitle}</h1>
        <div className="ops-ml-review__clip-nav">
          <button
            type="button"
            className="ops-ml-review__nav-arrow"
            disabled={!props.canPrevious}
            aria-label="Previous clip"
            onClick={() => props.onPrevious()}
          >
            ◀
          </button>
          <span className="ops-ml-review__clip-counter">
            CLIP {props.previewIndex + 1} OF {props.totalClips}
          </span>
          <button
            type="button"
            className="ops-ml-review__nav-arrow"
            disabled={!props.canNext}
            aria-label="Next clip"
            onClick={() => props.onNext()}
          >
            ▶
          </button>
        </div>
        <button
          type="button"
          className="ops-ml-review__queue-badge"
          aria-label={`Queue ${props.kept} clips`}
          aria-expanded={queueOpen}
          onClick={() => setQueueOpen((open) => !open)}
        >
          <span className="ops-ml-review__queue-badge-label">QUEUE</span>
          <strong className="ops-ml-review__queue-badge-count">{props.kept}</strong>
        </button>
        <div className="ops-ml-review__topbar-tools">
          {props.onOpenSetup ? (
            <button
              type="button"
              className="ops-btn ops-ml-deck__bar-btn"
              onClick={() => props.onOpenSetup?.()}
            >
              Setup
            </button>
          ) : null}
          <button
            type="button"
            className="ops-btn ops-ml-deck__bar-btn ops-ml-deck__bar-btn--focus"
            aria-pressed
            onClick={() => props.onToggleFocus()}
          >
            Focus On
          </button>
          <button
            type="button"
            className={`ops-btn ops-ml-deck__bar-btn${props.showAdvanced ? " ops-ml-deck__bar-btn--on" : ""}`}
            aria-expanded={props.showAdvanced}
            onClick={() => props.onToggleAdvanced()}
          >
            {props.showAdvanced ? "Hide Advanced" : "Advanced"}
          </button>
        </div>
      </header>

      {props.showAdvanced ? (
        <div className="ops-ml-deck__advanced">{props.advancedPanel}</div>
      ) : null}

      <div className="ops-ml-review__body">
        <div className="ops-ml-review__columns">
          <section className="ops-ml-review__center">
            <div className="ops-ml-deck__video-wrap ops-ml-review__video-wrap">
              <video
                ref={props.videoRef}
                className="ops-ml-deck__video ops-ml-review__video"
                src={props.videoUrl}
                controls
                preload="metadata"
                onTimeUpdate={props.onTimeUpdate}
              />
            </div>
            <div className="ops-ml-review__trim">
              <ClipSelectionPanel
                clipStartSec={props.clip.startSec}
                clipEndSec={props.clip.endSec}
                playheadSec={props.playheadSec}
                selection={props.selection}
                thumbs={activeThumbs}
                thumbsLoading={props.thumbsLoading}
                onSelectionChange={props.onSelectionChange}
                onSeek={props.onSeek}
                onTrimDragStart={props.onTrimDragStart}
                onTrimPreview={props.onTrimPreview}
                onTrimDragEnd={props.onTrimDragEnd}
                onSplitAtPlayhead={props.onSplitAtPlayhead}
              />
            </div>
          </section>

          <aside className="ops-ml-review__side">
            <div className="ops-ml-review__title-block">
              <label className="ops-ml-review__field-label" htmlFor="ops-ml-review-title">
                Suggested Name
              </label>
              <input
                id="ops-ml-review-title"
                ref={titleRef}
                className="ops-ml-field__input ops-ml-review__title-input"
                value={props.clip.title}
                onChange={(e) => props.onTitleChange(e.target.value)}
              />
              <div className="ops-ml-review__title-actions">
                <button
                  type="button"
                  className="ops-btn ops-ml-review__accept-btn"
                  onClick={() => props.onAcceptSuggestion()}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="ops-btn ops-ml-review__regen-btn"
                  onClick={() => props.onRegenerateTitle()}
                >
                  Regenerate Name
                </button>
              </div>
            </div>

            <div className="ops-ml-review__type-block">
              <p className="ops-ml-review__field-label">Suggested Type</p>
              <CuratorClassificationPanel
                title={props.clip.title}
                category={props.clip.category}
                onCategorize={(category) => props.onCategorize(category)}
              />
            </div>

            <div className="ops-ml-review__actions">
              <button
                type="button"
                className={`ops-ml-review__action ops-ml-review__action--favorite${
                  props.isFavorite ? " ops-ml-review__action--on" : ""
                }`}
                onClick={() => props.onFavoriteClip()}
              >
                ★ Favorite
              </button>
              <button
                type="button"
                className="ops-ml-review__action"
                disabled={!props.canPrevious}
                onClick={() => props.onPrevious()}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="ops-ml-review__action ops-ml-review__action--next"
                disabled={!props.canNext}
                onClick={() => props.onNext()}
              >
                Next Clip →
              </button>
            </div>
          </aside>
        </div>
      </div>

      <ClipQueueFilmstrip
        layout="filmstrip"
        chapters={props.chapters}
        activeId={props.clip.id}
        thumbs={props.chapterThumbs}
        thumbsLoading={props.thumbsLoading}
        onSelect={props.onSelectClip}
        onMergeBoundary={props.onMergeBoundary}
      />

      {queueOpen ? (
        <button
          type="button"
          className="ops-ml-review-queue-drawer__backdrop"
          aria-label="Close queue"
          onClick={() => setQueueOpen(false)}
        />
      ) : null}
      <aside
        className={`ops-ml-review-queue-drawer${
          queueOpen ? " ops-ml-review-queue-drawer--open" : ""
        }`}
        aria-hidden={!queueOpen}
      >
        <ReviewQueuePanel
          items={queueItems}
          thumbs={props.chapterThumbs}
          thumbsLoading={props.thumbsLoading}
          onSelect={(chapter) => {
            props.onSelectClip(chapter);
            setQueueOpen(false);
          }}
          onRemove={props.onRemoveFromQueue}
          onClose={() => setQueueOpen(false)}
        />
      </aside>
    </div>
  );
}
