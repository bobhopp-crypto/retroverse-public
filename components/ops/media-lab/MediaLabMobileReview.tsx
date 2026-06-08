"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import type {
  ClipTagSuggestion,
  ContentType,
} from "@/lib/ops/media-lab/editorial/transcript-suggestions";
import type { ClipReviewStatus } from "@/lib/ops/media-lab/editorial/review-status";

const SWIPE_THRESHOLD_PX = 72;
const SWIPE_MAX_DRAG_PX = 140;

const MOBILE_CONTENT_TYPES: ContentType[] = [
  "Performance",
  "Commercial",
  "Promo",
  "Award",
  "Interview",
];

type MediaLabMobileReviewProps = {
  chapters: EditorialChapterRow[];
  videoUrl: string | null;
  cardIndex: number;
  onCardIndexChange: (index: number) => void;
  onReviewStatus: (id: string, status: ClipReviewStatus) => void;
  onApplyContentType: (id: string, type: ContentType) => void;
  onApplySuggestedTitle: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
};

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatEndClock(endTimecode: string): string {
  return endTimecode.length > 8 ? endTimecode.slice(3, 11) : endTimecode;
}

export function MediaLabMobileReview(props: MediaLabMobileReviewProps) {
  const chapter = props.chapters[props.cardIndex] ?? null;
  const suggestion: ClipTagSuggestion | null | undefined = chapter?.tagSuggestion;
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [swipeHint, setSwipeHint] = useState<"keep" | "reject" | null>(null);

  const seekToChapter = useCallback((ch: EditorialChapterRow, autoplay = false) => {
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = ch.startSec;
      if (autoplay) void v.play().catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (!chapter) return;
    seekToChapter(chapter);
  }, [chapter, seekToChapter]);

  function goToIndex(next: number) {
    if (next < 0 || next >= props.chapters.length) return;
    props.onCardIndexChange(next);
    setDragX(0);
    setSwipeHint(null);
  }

  function prevClip() {
    goToIndex(props.cardIndex - 1);
  }

  function nextClip() {
    goToIndex(props.cardIndex + 1);
  }

  function applyReview(status: ClipReviewStatus, advance = true) {
    if (!chapter) return;
    props.onReviewStatus(chapter.id, status);
    if (advance && props.cardIndex < props.chapters.length - 1) {
      goToIndex(props.cardIndex + 1);
    }
  }

  function handleSwipeCommit(direction: "keep" | "reject") {
    if (!chapter) return;
    setDragX(direction === "keep" ? SWIPE_MAX_DRAG_PX : -SWIPE_MAX_DRAG_PX);
    window.setTimeout(() => {
      applyReview(direction === "keep" ? "Keep" : "Reject");
      setDragX(0);
      setSwipeHint(null);
    }, 120);
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
    setDragX(0);
    setSwipeHint(null);
  }

  function onTouchMove(e: React.TouchEvent) {
    const start = touchStart.current;
    const t = e.touches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      e.preventDefault();
    }
    const clamped = Math.max(-SWIPE_MAX_DRAG_PX, Math.min(SWIPE_MAX_DRAG_PX, dx));
    setDragX(clamped);
    if (clamped > SWIPE_THRESHOLD_PX * 0.5) setSwipeHint("keep");
    else if (clamped < -SWIPE_THRESHOLD_PX * 0.5) setSwipeHint("reject");
    else setSwipeHint(null);
  }

  function onTouchEnd() {
    if (dragX >= SWIPE_THRESHOLD_PX) handleSwipeCommit("keep");
    else if (dragX <= -SWIPE_THRESHOLD_PX) handleSwipeCommit("reject");
    else {
      setDragX(0);
      setSwipeHint(null);
    }
    touchStart.current = null;
  }

  function handleVideoTimeUpdate() {
    const v = videoRef.current;
    if (!v || !chapter) return;
    if (v.currentTime < chapter.endSec - 0.08) return;
    v.pause();
    v.currentTime = chapter.endSec;
  }

  if (props.chapters.length === 0) {
    return (
      <div className="ops-ml-mobile-review ops-ml-mobile-review--empty">
        <p className="ops-dim">No clips match the current filter.</p>
      </div>
    );
  }

  if (!chapter || !props.videoUrl) {
    return (
      <div className="ops-ml-mobile-review ops-ml-mobile-review--empty">
        <p className="ops-dim">Video unavailable for mobile review.</p>
      </div>
    );
  }

  const cardStyle = {
    transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
  } as const;

  return (
    <div className="ops-ml-mobile-review">
      <header className="ops-ml-mobile-review__head">
        <span className="ops-ml-mobile-review__counter">
          Clip {props.cardIndex + 1} of {props.chapters.length}
        </span>
        <span className="ops-dim ops-ml-mobile-review__swipe-hint">
          Swipe right Keep · left Reject
        </span>
      </header>

      <div
        className={`ops-ml-mobile-review__card${swipeHint ? ` ops-ml-mobile-review__card--${swipeHint}` : ""}`}
        style={cardStyle}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {swipeHint === "keep" ? (
          <div className="ops-ml-mobile-review__overlay ops-ml-mobile-review__overlay--keep">
            Keep
          </div>
        ) : null}
        {swipeHint === "reject" ? (
          <div className="ops-ml-mobile-review__overlay ops-ml-mobile-review__overlay--delete">
            Reject
          </div>
        ) : null}

        <div className="ops-ml-mobile-review__video-wrap">
          <video
            ref={videoRef}
            className="ops-ml-mobile-review__video"
            src={props.videoUrl}
            playsInline
            controls
            preload="metadata"
            onTimeUpdate={handleVideoTimeUpdate}
          />
        </div>

        <div className="ops-ml-mobile-review__meta">
          {suggestion ? (
            <>
              <p className="ops-ml-mobile-review__suggest-line">
                <span className="ops-ml-mobile-review__suggest-label">Suggested:</span>
                <span className="ops-ml-mobile-review__suggest-title">
                  {suggestion.title}
                  <span className="ops-ml-mobile-review__conf">({suggestion.confidence}%)</span>
                </span>
              </p>
              {suggestion.ocrSubject ? (
                <p className="ops-ml-mobile-review__ocr">OCR: {suggestion.ocrSubject}</p>
              ) : null}
            </>
          ) : (
            <p className="ops-ml-mobile-review__suggest-title">{chapter.title}</p>
          )}
          <p className="ops-mono ops-ml-mobile-review__times">
            {chapter.clock} → {formatEndClock(chapter.end)} · {formatDur(chapter.durationSec)}
          </p>
          {chapter.reviewStatus ? (
            <p className="ops-ml-mobile-review__status">Review: {chapter.reviewStatus}</p>
          ) : null}
        </div>

        <div className="ops-ml-mobile-review__review-row">
          {(["Keep", "Reject"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`ops-btn ops-ml-mobile-review__review-btn ops-ml-mobile-review__review-btn--${status.toLowerCase()}${
                chapter.reviewStatus === status ? " ops-ml-mobile-review__review-btn--on" : ""
              }`}
              onClick={() => props.onReviewStatus(chapter.id, status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="ops-ml-mobile-review__type-row">
          {MOBILE_CONTENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`ops-ml-tag-chip ops-ml-tag-chip--content${
                suggestion?.type === type ? " ops-ml-tag-chip--hint" : ""
              }`}
              onClick={() => props.onApplyContentType(chapter.id, type)}
            >
              {type}
            </button>
          ))}
        </div>

        {suggestion &&
        suggestion.title.trim().toLowerCase() !== chapter.title.trim().toLowerCase() ? (
          <button
            type="button"
            className="ops-btn ops-btn--ok ops-ml-mobile-review__accept"
            onClick={() => props.onApplySuggestedTitle(chapter.id)}
          >
            Accept Suggestion
          </button>
        ) : null}

        <input
          className="ops-ml-field__input ops-ml-mobile-review__title"
          value={chapter.title}
          onChange={(e) => props.onTitleChange(chapter.id, e.target.value)}
          placeholder="Chapter title"
        />
      </div>

      <nav className="ops-ml-mobile-review__nav">
        <button
          type="button"
          className="ops-btn ops-ml-mobile-review__nav-btn"
          disabled={props.cardIndex <= 0}
          onClick={prevClip}
        >
          Previous
        </button>
        <button
          type="button"
          className="ops-btn ops-ml-mobile-review__nav-btn"
          disabled={props.cardIndex >= props.chapters.length - 1}
          onClick={nextClip}
        >
          Next clip
        </button>
      </nav>
    </div>
  );
}
