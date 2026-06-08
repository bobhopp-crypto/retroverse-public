"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from "react";

import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";
import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import { searchTimelineTranscript, type TimelineSearchHit } from "@/lib/ops/media-lab/timeline-transcript-search";

import type { ChapterThumbSet } from "./ChapterThumbTriplet";
import { ClipQueueFilmstrip } from "./ClipQueueFilmstrip";
import { ClipSelectionPanel, type ClipSelectionState } from "./ClipSelectionPanel";
import { CuratorClassificationPanel } from "./CuratorClassificationPanel";
import type { CuratorCategory } from "./curator-categories";
import { MIN_NAME_REGENERATIONS } from "@/lib/ops/media-lab/editorial/name-regeneration";
import { HarvestLibraryPanel } from "./HarvestLibraryPanel";
import { ReviewQueuePanel } from "./ReviewQueuePanel";
import { TimelineSearchResultsPanel } from "./TimelineSearchResultsPanel";

type FocusReviewDeckProps = {
  showTitle: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  onTimeUpdate: () => void;
  clip: EditorialChapterRow;
  playheadSec: number;
  showDurationSec: number;
  selection: ClipSelectionState;
  onSelectionChange: (next: ClipSelectionState) => void;
  onSeek: (sec: number) => void;
  onTrimDragStart?: () => void;
  onTrimPreview?: (sec: number) => void;
  onTrimDragEnd?: (sec: number) => void;
  onTitleChange: (title: string) => void;
  onRegenerateTitle: () => void;
  nameHistory?: string[];
  onRestorePreviousName?: (name: string) => void;
  nameRegenCount?: number;
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
  onDeleteChapter?: (chapterId: string) => void;
  timelineFlashIds?: string[];
  onExportQueue?: () => void;
  exportQueueBusy?: boolean;
  harvestRefreshKey?: number;
  queueCloseSignal?: number;
  segments?: TranscriptSegment[];
  titleAccepted?: boolean;
  titleAcceptedIds?: Record<string, boolean>;
  advancedPanel: ReactNode;
};

export function FocusReviewDeck(props: FocusReviewDeckProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [timelineScrollToken, setTimelineScrollToken] = useState(0);
  const [timelineScrollSec, setTimelineScrollSec] = useState(0);
  const activeThumbs = props.chapterThumbs[props.clip.id] ?? null;

  const segments = props.segments ?? [];
  const searchActive = searchQuery.trim().length >= 2;
  const searchHits = useMemo(
    () =>
      searchActive
        ? searchTimelineTranscript(props.chapters, segments, searchQuery)
        : [],
    [props.chapters, searchActive, searchQuery, segments],
  );

  useEffect(() => {
    if (!searchActive) {
      setActiveSearchIndex(-1);
    }
  }, [searchActive, searchQuery]);

  useEffect(() => {
    if ((props.queueCloseSignal ?? 0) > 0) {
      setQueueOpen(false);
    }
  }, [props.queueCloseSignal]);

  const jumpToSearchHit = useCallback(
    (hit: TimelineSearchHit, index: number) => {
      setActiveSearchIndex(index);
      props.onSelectClip(hit.chapter);
      props.onSeek(hit.matchSec);
      setTimelineScrollSec(hit.matchSec);
      setTimelineScrollToken((t) => t + 1);
    },
    [props.onSeek, props.onSelectClip],
  );

  const navigateSearch = useCallback(
    (direction: "next" | "prev") => {
      if (searchHits.length === 0) return;
      const nextIdx =
        activeSearchIndex < 0
          ? 0
          : direction === "next"
            ? (activeSearchIndex + 1) % searchHits.length
            : (activeSearchIndex - 1 + searchHits.length) % searchHits.length;
      jumpToSearchHit(searchHits[nextIdx], nextIdx);
    },
    [activeSearchIndex, jumpToSearchHit, searchHits],
  );

  const queueItems = useMemo(() => {
    const items = props.chapters.filter((ch) => ch.reviewStatus === "Keep");
    return items;
  }, [props.chapters]);

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
          className="ops-ml-review__queue-badge ops-ml-review__queue-badge--harvest"
          aria-label="Open harvest library"
          aria-expanded={harvestOpen}
          onClick={() => setHarvestOpen((open) => !open)}
        >
          <span className="ops-ml-review__queue-badge-label">HARVEST</span>
        </button>
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
            <div
              className={`ops-ml-review__title-block${
                props.titleAccepted ? " ops-ml-review__title-block--accepted" : ""
              }`}
            >
              <label className="ops-ml-review__field-label" htmlFor="ops-ml-review-title">
                {props.titleAccepted ? "Name · Accepted ✓" : "Suggested Name"}
              </label>
              <input
                id="ops-ml-review-title"
                ref={titleRef}
                className={`ops-ml-field__input ops-ml-review__title-input${
                  props.titleAccepted ? " ops-ml-review__title-input--accepted" : ""
                }`}
                value={props.clip.title}
                aria-invalid={props.titleAccepted ? false : undefined}
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
                  title={`Regenerate name (${props.nameRegenCount ?? 0} passes · ${MIN_NAME_REGENERATIONS}+ candidates)`}
                >
                  Regenerate Name
                </button>
              </div>
              {props.nameHistory && props.nameHistory.length > 0 ? (
                <div className="ops-ml-review__name-history">
                  <p className="ops-ml-review__name-history-label">Previous</p>
                  <ul className="ops-ml-review__name-history-list">
                    {props.nameHistory.map((name) => (
                      <li key={name}>
                        <button
                          type="button"
                          className="ops-ml-review__name-history-item"
                          onClick={() => props.onRestorePreviousName?.(name)}
                        >
                          {name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="ops-ml-review__type-block">
              {searchActive ? (
                <TimelineSearchResultsPanel
                  hits={searchHits}
                  showDurationSec={props.showDurationSec}
                  activeIndex={activeSearchIndex}
                  onSelectHit={jumpToSearchHit}
                  onNavigate={navigateSearch}
                />
              ) : (
                <>
                  <p className="ops-ml-review__field-label">Suggested Type</p>
                  <CuratorClassificationPanel
                    title={props.clip.title}
                    category={props.clip.category}
                    onCategorize={(category) => props.onCategorize(category)}
                  />
                </>
              )}
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
        layout="magnetic"
        chapters={props.chapters}
        activeId={props.clip.id}
        thumbs={props.chapterThumbs}
        thumbsLoading={props.thumbsLoading}
        titleAcceptedIds={props.titleAcceptedIds}
        playheadSec={props.playheadSec}
        showDurationSec={props.showDurationSec}
        onSeek={props.onSeek}
        onSelect={props.onSelectClip}
        onMergeBoundary={props.onMergeBoundary}
        onDeleteChapter={props.onDeleteChapter}
        onSplitAtPlayhead={props.onSplitAtPlayhead}
        flashIds={props.timelineFlashIds}
        segments={props.segments}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchNavigate={navigateSearch}
        searchHits={searchHits}
        timelineScrollToken={timelineScrollToken}
        timelineScrollSec={timelineScrollSec}
      />

      {queueOpen || harvestOpen ? (
        <button
          type="button"
          className="ops-ml-review-queue-drawer__backdrop"
          aria-label="Close panel"
          onClick={() => {
            setQueueOpen(false);
            setHarvestOpen(false);
          }}
        />
      ) : null}
      <aside
        className={`ops-ml-harvest-drawer${
          harvestOpen ? " ops-ml-harvest-drawer--open" : ""
        }`}
        aria-hidden={!harvestOpen}
      >
        <HarvestLibraryPanel
          refreshKey={props.harvestRefreshKey}
          onClose={() => setHarvestOpen(false)}
        />
      </aside>
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
          onExportQueue={props.onExportQueue}
          exportBusy={props.exportQueueBusy}
        />
      </aside>
    </div>
  );
}
