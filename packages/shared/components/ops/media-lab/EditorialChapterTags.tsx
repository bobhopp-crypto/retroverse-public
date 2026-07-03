"use client";

import { useRef, useState } from "react";

import {
  CLIP_REVIEW_STATUSES,
  type ClipReviewStatus,
} from "@/lib/ops/media-lab/editorial/review-status";
import {
  parseTypedTitle,
  type ClipTagSuggestion,
  type ContentType,
} from "@/lib/ops/media-lab/editorial/transcript-suggestions";

import { FocusZone } from "./FocusZone";
import { FOCUS_WORKSTATION_TYPES } from "./focus-workstation-types";

const TYPE_TOGGLE_ROWS: { type: ContentType; label: string }[][] = [
  [
    { type: "Performance", label: "Performance" },
    { type: "Commercial", label: "Commercial" },
    { type: "Award", label: "Award" },
    { type: "Acceptance Speech", label: "Speech" },
  ],
  [
    { type: "Presenter", label: "Presenter" },
    { type: "Interview", label: "Interview" },
    { type: "Promo", label: "Promo" },
    { type: "Movie Trailer", label: "Trailer" },
  ],
  [
    { type: "News", label: "News" },
    { type: "Station ID", label: "Station ID" },
  ],
];

type EditorialChapterTagsProps = {
  title: string;
  suggestion: ClipTagSuggestion | null;
  reviewStatus?: ClipReviewStatus;
  variant?: "editor" | "card";
  focus?: boolean;
  deck?: boolean;
  clipMeta?: { index: number; total: number; clock: string; duration: string };
  onTitleChange: (title: string) => void;
  onApplySuggestedTitle: () => void;
  onApplyContentType: (type: ContentType) => void;
  onReviewStatusChange: (status: ClipReviewStatus | undefined) => void;
};

export function EditorialChapterTags(props: EditorialChapterTagsProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const variant = props.variant ?? "editor";
  const focus = props.focus ?? false;
  const deck = props.deck ?? false;
  const suggestion = props.suggestion;
  const parsed = parseTypedTitle(props.title);
  const displayTitle =
    suggestion?.title?.trim() ||
    (parsed.subject && parsed.subject !== props.title.trim() ? parsed.subject : props.title.trim()) ||
    "Untitled clip";
  const showSuggestion =
    suggestion &&
    suggestion.title.trim().toLowerCase() !== props.title.trim().toLowerCase();

  if (focus && variant === "editor") {
    const classifyBody = (
      <div className={`ops-ml-focus-card${deck ? " ops-ml-focus-card--deck" : ""}`}>
        <div className="ops-ml-focus-card__title-block">
          <span className="ops-ml-focus-card__title-label">Suggested title</span>
          <p className="ops-ml-focus-card__title">{displayTitle}</p>
          {showSuggestion ? (
            <button
              type="button"
              className="ops-btn ops-ml-focus-card__accept ops-ml-focus-card__accept--secondary"
              title="Use the AI-generated title."
              onClick={() => props.onApplySuggestedTitle()}
            >
              Accept suggestion <span className="ops-ml-focus-card__key">A</span>
            </button>
          ) : (
            <p className="ops-ml-focus-card__title-note">Title matches suggestion.</p>
          )}
        </div>

        <div
          className={`ops-ml-focus-card__types${deck ? " ops-ml-focus-card__types--deck" : ""}`}
          role="group"
          aria-label="Content type"
        >
          {deck ? (
            FOCUS_WORKSTATION_TYPES.map(({ key, type, label, help }) => (
              <button
                key={type}
                type="button"
                className={`ops-ml-type-toggle ops-ml-type-toggle--deck${
                  parsed.type === type ? " ops-ml-type-toggle--on" : ""
                }${suggestion?.type === type && parsed.type !== type ? " ops-ml-type-toggle--hint" : ""}`}
                aria-pressed={parsed.type === type}
                title={help}
                onClick={() => props.onApplyContentType(type)}
              >
                {label}
                <span className="ops-ml-focus-card__key">{key}</span>
              </button>
            ))
          ) : (
            <>
              <div className="ops-ml-focus-card__type-row">
                {FOCUS_WORKSTATION_TYPES.slice(0, 4).map(({ key, type, label, help }) => (
                  <button
                    key={type}
                    type="button"
                    className={`ops-ml-type-toggle ops-ml-type-toggle--focus${
                      parsed.type === type ? " ops-ml-type-toggle--on" : ""
                    }${suggestion?.type === type && parsed.type !== type ? " ops-ml-type-toggle--hint" : ""}`}
                    aria-pressed={parsed.type === type}
                    title={help}
                    onClick={() => props.onApplyContentType(type)}
                  >
                    {label}
                    <span className="ops-ml-focus-card__key">{key}</span>
                  </button>
                ))}
              </div>
              <div className="ops-ml-focus-card__type-row">
                {FOCUS_WORKSTATION_TYPES.slice(4).map(({ key, type, label, help }) => (
                  <button
                    key={type}
                    type="button"
                    className={`ops-ml-type-toggle ops-ml-type-toggle--focus${
                      parsed.type === type ? " ops-ml-type-toggle--on" : ""
                    }${suggestion?.type === type && parsed.type !== type ? " ops-ml-type-toggle--hint" : ""}`}
                    aria-pressed={parsed.type === type}
                    title={help}
                    onClick={() => props.onApplyContentType(type)}
                  >
                    {label}
                    <span className="ops-ml-focus-card__key">{key}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {!deck ? (
          <details className="ops-ml-fold-panel ops-ml-fold-panel--inline ops-ml-focus-card__advanced">
            <summary className="ops-ml-fold-panel__summary">Advanced details</summary>
            <div className="ops-ml-fold-panel__body ops-ml-focus-card__advanced-body">
              {props.clipMeta ? (
                <p className="ops-ml-focus-card__meta">
                  {props.clipMeta.clock} · {props.clipMeta.duration}
                </p>
              ) : null}
              <label className="ops-ml-focus-card__advanced-label">
                Chapter title
                <input
                  ref={titleRef}
                  className="ops-ml-editorial-table__title ops-ml-chapter-tags__title"
                  value={props.title}
                  onChange={(e) => props.onTitleChange(e.target.value)}
                  placeholder="Chapter title"
                />
              </label>
              {suggestion ? (
                <div className="ops-ml-chapter-tags__details">
                  <span>Confidence {suggestion.confidence}%</span>
                  <span>Suggested type {suggestion.type}</span>
                  {suggestion.ocrSubject ? <span>OCR {suggestion.ocrSubject}</span> : null}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    );

    if (deck) return classifyBody;

    return (
      <FocusZone icon="🏷" label="Classification">
        {classifyBody}
      </FocusZone>
    );
  }

  return (
    <div
      className={`ops-ml-chapter-tags ops-ml-chapter-tags--${variant}${
        variant === "card" ? " ops-ml-chapter-tags--compact" : ""
      }`}
    >
      {showSuggestion ? (
        <div className="ops-ml-chapter-tags__suggest-row">
          <p className="ops-ml-chapter-tags__suggest-title-line">{suggestion.title}</p>
          <div className="ops-ml-chapter-tags__suggest-actions">
            <button
              type="button"
              className="ops-btn ops-btn--sm ops-btn--ok"
              onClick={() => props.onApplySuggestedTitle()}
            >
              Accept
            </button>
            <button
              type="button"
              className="ops-btn ops-btn--sm"
              onClick={() => titleRef.current?.focus()}
            >
              Edit
            </button>
          </div>
        </div>
      ) : suggestion ? (
        <p className="ops-ml-chapter-tags__suggest-match">Matches suggestion</p>
      ) : null}

      <div className="ops-ml-chapter-tags__type-grid" role="group" aria-label="Content type">
        {TYPE_TOGGLE_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="ops-ml-chapter-tags__type-row">
            {row.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                className={`ops-ml-type-toggle${
                  parsed.type === type ? " ops-ml-type-toggle--on" : ""
                }${suggestion?.type === type && parsed.type !== type ? " ops-ml-type-toggle--hint" : ""}`}
                aria-pressed={parsed.type === type}
                onClick={() => props.onApplyContentType(type)}
              >
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="ops-ml-chapter-tags__review-row" role="group" aria-label="Review">
        {CLIP_REVIEW_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`ops-ml-review-toggle ops-ml-review-toggle--${status.toLowerCase()}${
              props.reviewStatus === status ? " ops-ml-review-toggle--on" : ""
            }`}
            aria-pressed={props.reviewStatus === status}
            onClick={() =>
              props.onReviewStatusChange(
                props.reviewStatus === status ? undefined : status,
              )
            }
          >
            {status}
          </button>
        ))}
      </div>

      <input
        ref={titleRef}
        className="ops-ml-editorial-table__title ops-ml-chapter-tags__title"
        value={props.title}
        onChange={(e) => props.onTitleChange(e.target.value)}
        placeholder="Chapter title"
        aria-label="Chapter title"
      />

      {suggestion && variant === "editor" ? (
        <button
          type="button"
          className="ops-ml-chapter-tags__details-btn"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? "Hide details" : "Details"}
        </button>
      ) : null}

      {showDetails && suggestion ? (
        <div className="ops-ml-chapter-tags__details">
          <span>Confidence {suggestion.confidence}%</span>
          <span>Type {suggestion.type}</span>
          {suggestion.ocrSubject ? <span>OCR {suggestion.ocrSubject}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
