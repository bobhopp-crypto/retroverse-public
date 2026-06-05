"use client";

import type { RefObject, ReactNode } from "react";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";
import type { ClipReviewStatus } from "@/lib/ops/media-lab/editorial/review-status";

import type { ChapterThumbSet } from "./ChapterThumbTriplet";
import { ClipQueueFilmstrip } from "./ClipQueueFilmstrip";
import { ClipTranscriptStrip, type TranscriptStripMode } from "./ClipTranscriptStrip";

type FocusReviewDeckProps = {
  jobLabel: string;
  modeLabel: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  onTimeUpdate: () => void;
  segments: TranscriptSegment[];
  clip: EditorialChapterRow;
  playheadSec: number;
  transcriptMode: TranscriptStripMode;
  onTranscriptModeChange: (mode: TranscriptStripMode) => void;
  previewIndex: number;
  totalClips: number;
  kept: number;
  rejected: number;
  remaining: number;
  reviewStatus?: ClipReviewStatus;
  onKeep: () => void;
  onReject: () => void;
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
  classificationPanel: ReactNode;
};

export function FocusReviewDeck(props: FocusReviewDeckProps) {
  return (
    <div className="ops-ml-deck">
      <header className="ops-ml-deck__bar">
        <div className="ops-ml-deck__bar-left">
          <button
            type="button"
            className="ops-btn ops-ml-deck__bar-btn ops-ml-deck__bar-btn--focus"
            aria-pressed
            title="Review deck layout — optimized for batch clip review."
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
          {props.jobLabel}
          <span className="ops-ml-deck__bar-mode"> · {props.modeLabel}</span>
        </p>
      </header>

      {props.showAdvanced ? (
        <div className="ops-ml-deck__advanced">{props.advancedPanel}</div>
      ) : null}

      <div className="ops-ml-deck__main">
        <section className="ops-ml-deck__panel ops-ml-deck__panel--video">
          <header className="ops-ml-deck__panel-head">
            <span className="ops-ml-deck__panel-icon" aria-hidden="true">
              🎬
            </span>
            <h4 className="ops-ml-deck__panel-label">Video Review</h4>
          </header>
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
          <section className="ops-ml-deck__transcript">
            <header className="ops-ml-deck__subhead">
              <span className="ops-ml-deck__panel-icon" aria-hidden="true">
                📝
              </span>
              <h5 className="ops-ml-deck__subhead-label">Transcript</h5>
            </header>
            <ClipTranscriptStrip
              variant="deck"
              segments={props.segments}
              clipStartSec={props.clip.startSec}
              clipEndSec={props.clip.endSec}
              playheadSec={props.playheadSec}
              mode={props.transcriptMode}
              onModeChange={props.onTranscriptModeChange}
            />
          </section>
        </section>

        <section className="ops-ml-deck__panel ops-ml-deck__panel--classify">
          <header className="ops-ml-deck__panel-head">
            <span className="ops-ml-deck__panel-icon" aria-hidden="true">
              🏷
            </span>
            <h4 className="ops-ml-deck__panel-label">Classification</h4>
          </header>
          <div className="ops-ml-deck__classify-body">{props.classificationPanel}</div>
        </section>

        <section className="ops-ml-deck__panel ops-ml-deck__panel--decision">
          <header className="ops-ml-deck__panel-head">
            <span className="ops-ml-deck__panel-icon" aria-hidden="true">
              ✅
            </span>
            <h4 className="ops-ml-deck__panel-label">Decision</h4>
          </header>
          <div className="ops-ml-deck__decision-body">
            <div className="ops-ml-deck__status" aria-label="Review progress">
              <p className="ops-ml-deck__status-clip">
                Clip {props.previewIndex + 1} of {props.totalClips}
              </p>
              <dl className="ops-ml-deck__status-stats">
                <div>
                  <dt>Kept</dt>
                  <dd>{props.kept}</dd>
                </div>
                <div>
                  <dt>Rejected</dt>
                  <dd>{props.rejected}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{props.remaining}</dd>
                </div>
              </dl>
            </div>

            <div className="ops-ml-deck__actions" role="group" aria-label="Keep or reject">
              <button
                type="button"
                className={`ops-ml-deck__action ops-ml-deck__action--keep${
                  props.reviewStatus === "Keep" ? " ops-ml-deck__action--on" : ""
                }`}
                aria-pressed={props.reviewStatus === "Keep"}
                title="Export clip into assets."
                onClick={() => props.onKeep()}
              >
                Keep <span className="ops-ml-deck__key">K</span>
              </button>
              <button
                type="button"
                className={`ops-ml-deck__action ops-ml-deck__action--reject${
                  props.reviewStatus === "Reject" ? " ops-ml-deck__action--on" : ""
                }`}
                aria-pressed={props.reviewStatus === "Reject"}
                title="Skip clip during export."
                onClick={() => props.onReject()}
              >
                Reject <span className="ops-ml-deck__key">X</span>
              </button>
            </div>

            <div className="ops-ml-deck__nav" role="group" aria-label="Clip navigation">
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
                className="ops-ml-deck__action ops-ml-deck__action--nav ops-ml-deck__action--next"
                disabled={!props.canNext}
                title="Go to the next clip."
                onClick={() => props.onNext()}
              >
                Next → <span className="ops-ml-deck__key">N</span>
              </button>
            </div>

            <p className="ops-ml-deck__shortcuts" aria-label="Keyboard shortcuts">
              <span className="ops-ml-deck__shortcuts-label">Shortcuts:</span>
              <kbd>1</kbd>–<kbd>8</kbd> Type · <kbd>A</kbd> Accept · <kbd>K</kbd> Keep · <kbd>X</kbd> Reject ·{" "}
              <kbd>P</kbd>/<kbd>N</kbd> Nav · <kbd>Space</kbd> Play
            </p>
          </div>
        </section>
      </div>

      <ClipQueueFilmstrip
        chapters={props.chapters}
        activeId={props.clip.id}
        thumbs={props.chapterThumbs}
        thumbsLoading={props.thumbsLoading}
        onSelect={props.onSelectClip}
      />
    </div>
  );
}
