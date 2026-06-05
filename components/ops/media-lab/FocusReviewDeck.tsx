"use client";

import type { RefObject, ReactNode } from "react";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import type { ClipTagSuggestion } from "@/lib/ops/media-lab/editorial/transcript-suggestions";

import { AiSuggestionPanel } from "./AiSuggestionPanel";
import { ClipMetadataPanel } from "./ClipMetadataPanel";
import type { ChapterThumbSet } from "./ChapterThumbTriplet";
import { ClipQueueFilmstrip } from "./ClipQueueFilmstrip";
import { ClipSelectionPanel, type ClipSelectionState } from "./ClipSelectionPanel";
import { CuratorClassificationPanel } from "./CuratorClassificationPanel";
import type { CuratorCategory } from "./curator-categories";

type FocusReviewDeckProps = {
  showTitle: string;
  modeLabel: string;
  sourceFilename: string;
  showDurationSec: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  onTimeUpdate: () => void;
  clip: EditorialChapterRow;
  suggestion: ClipTagSuggestion | null;
  playheadSec: number;
  selection: ClipSelectionState;
  onSelectionChange: (next: ClipSelectionState) => void;
  onSeek: (sec: number) => void;
  onTitleChange: (title: string) => void;
  previewIndex: number;
  totalClips: number;
  favorites: number;
  kept: number;
  remaining: number;
  isKept: boolean;
  isFavorite: boolean;
  onKeepClip: () => void;
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
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onToggleFocus: () => void;
  advancedPanel: ReactNode;
};

export function FocusReviewDeck(props: FocusReviewDeckProps) {
  const activeThumbs = props.chapterThumbs[props.clip.id] ?? null;

  return (
    <div className="ops-ml-deck ops-ml-deck--curator ops-ml-deck--workstation">
      <header className="ops-ml-deck__bar">
        <div className="ops-ml-deck__bar-left">
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
            {props.showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </button>
        </div>
        <p className="ops-ml-deck__bar-title">
          {props.showTitle}
          <span className="ops-ml-deck__bar-mode"> · {props.modeLabel}</span>
          <span className="ops-ml-deck__bar-queue">
            {" "}
            · Queue {props.kept}
          </span>
        </p>
        <p className="ops-ml-deck__bar-counter">
          Clip {props.previewIndex + 1} / {props.totalClips}
        </p>
      </header>

      {props.showAdvanced ? (
        <div className="ops-ml-deck__advanced">{props.advancedPanel}</div>
      ) : null}

      <div className="ops-ml-deck__workstation">
        <section className="ops-ml-deck__panel ops-ml-deck__panel--editor">
          <ClipMetadataPanel
            compact
            showTitle={props.showTitle}
            clipIndex={props.previewIndex}
            totalClips={props.totalClips}
            startSec={props.clip.startSec}
            endSec={props.clip.endSec}
            showDurationSec={props.showDurationSec}
            sourceFilename={props.sourceFilename}
          />
          <div className="ops-ml-deck__video-wrap">
            <video
              ref={props.videoRef}
              className="ops-ml-deck__video"
              src={props.videoUrl}
              controls
              preload="metadata"
              onTimeUpdate={props.onTimeUpdate}
            />
          </div>
          <ClipSelectionPanel
            clipStartSec={props.clip.startSec}
            clipEndSec={props.clip.endSec}
            playheadSec={props.playheadSec}
            selection={props.selection}
            thumbs={activeThumbs}
            thumbsLoading={props.thumbsLoading}
            onSelectionChange={props.onSelectionChange}
            onSeek={props.onSeek}
          />

          <div className="ops-ml-deck__editor-controls">
            <div className="ops-ml-deck__title-row">
              <label className="ops-ml-deck__title-label" htmlFor="ops-ml-deck-title">
                Suggested Name
              </label>
              <div className="ops-ml-deck__title-field">
                <input
                  id="ops-ml-deck-title"
                  className="ops-ml-field__input ops-ml-deck__title-input"
                  value={props.clip.title}
                  onChange={(e) => props.onTitleChange(e.target.value)}
                />
                <button
                  type="button"
                  className="ops-btn ops-ml-deck__title-accept"
                  title="Accept AI suggested title"
                  onClick={() => props.onAcceptSuggestion()}
                >
                  Accept <span className="ops-ml-deck__key">A</span>
                </button>
              </div>
            </div>

            <AiSuggestionPanel
              suggestion={props.suggestion}
              onAccept={() => props.onAcceptSuggestion()}
            />

            <CuratorClassificationPanel
              title={props.clip.title}
              category={props.clip.category}
              onCategorize={(category) => props.onCategorize(category)}
            />

            <div className="ops-ml-deck__actions-row">
              <div className="ops-ml-deck__nav-stats">
                <span className="ops-ml-deck__nav-stats-favorites">
                  <strong>⭐ Favorites:</strong> {props.favorites}
                </span>
                <span>
                  <strong>Kept:</strong> {props.kept}
                </span>
                <span>
                  <strong>Remaining:</strong> {props.remaining}
                </span>
              </div>
              <div className="ops-ml-deck__actions">
                <button
                  type="button"
                  className="ops-ml-deck__action ops-ml-deck__action--nav"
                  disabled={!props.canPrevious}
                  title="Go to the previous clip."
                  onClick={() => props.onPrevious()}
                >
                  ← Previous <span className="ops-ml-deck__key">P</span>
                </button>
                <button
                  type="button"
                  className={`ops-ml-deck__action ops-ml-deck__action--favorite${
                    props.isFavorite ? " ops-ml-deck__action--on" : ""
                  }`}
                  title="Exceptional show material — keeps and marks as a favorite."
                  onClick={() => props.onFavoriteClip()}
                >
                  ⭐ Favorite <span className="ops-ml-deck__key">F</span>
                </button>
                <button
                  type="button"
                  className={`ops-ml-deck__action ops-ml-deck__action--keep${
                    props.isKept && !props.isFavorite ? " ops-ml-deck__action--on" : ""
                  }${props.isKept ? " ops-ml-deck__action--kept" : ""}`}
                  title="Keep this selection and add to queue."
                  onClick={() => props.onKeepClip()}
                >
                  Keep &amp; Add To Queue <span className="ops-ml-deck__key">K</span>
                </button>
                <button
                  type="button"
                  className="ops-ml-deck__action ops-ml-deck__action--nav ops-ml-deck__action--next"
                  disabled={!props.canNext}
                  title="Skip to the next clip."
                  onClick={() => props.onNext()}
                >
                  Next Clip → <span className="ops-ml-deck__key">N</span>
                </button>
              </div>
              <p className="ops-ml-deck__shortcuts" aria-label="Keyboard shortcuts">
                <kbd>1</kbd>–<kbd>0</kbd> category · <kbd>F</kbd> favorite · <kbd>K</kbd> keep ·{" "}
                <kbd>P</kbd>/<kbd>N</kbd> nav · <kbd>Space</kbd> play
              </p>
            </div>
          </div>
        </section>

        <aside className="ops-ml-deck__panel ops-ml-deck__panel--queue">
          <ClipQueueFilmstrip
            layout="sidebar"
            chapters={props.chapters}
            activeId={props.clip.id}
            thumbs={props.chapterThumbs}
            thumbsLoading={props.thumbsLoading}
            queueCount={props.kept}
            onSelect={props.onSelectClip}
          />
        </aside>
      </div>
    </div>
  );
}
