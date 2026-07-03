"use client";

import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";
import { coverageBadgeLabel } from "@/lib/charts/track-coverage";

import "./track-coverage.css";

type Props = {
  status: TrackCoverageStatus | null | undefined;
  className?: string;
};

export function TrackCoverageBadge({ status, className }: Props) {
  if (!status) return null;
  const label = coverageBadgeLabel(status);
  const extra = className?.trim() ? ` ${className.trim()}` : "";
  return (
    <span
      className={`rv2-coverage-badge rv2-coverage-badge--${status}${extra}`}
      aria-label={`Coverage: ${label}`}
    >
      {label}
    </span>
  );
}

type FilterProps = {
  value: "all" | TrackCoverageStatus;
  onChange: (value: "all" | TrackCoverageStatus) => void;
  className?: string;
};

const FILTER_OPTIONS: Array<{ id: "all" | TrackCoverageStatus; label: string }> = [
  { id: "all", label: "ALL" },
  { id: "owned", label: "OWNED" },
  { id: "youtube", label: "YOUTUBE" },
  { id: "missing", label: "MISSING" },
];

export function TrackCoverageFilterBar({ value, onChange, className }: FilterProps) {
  const rootClass = className?.trim()
    ? `rv2-coverage-filter ${className.trim()}`
    : "rv2-coverage-filter";

  return (
    <div className={rootClass} role="group" aria-label="Filter chart by coverage">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={
            value === option.id
              ? "rv2-coverage-filter__btn rv2-coverage-filter__btn--active"
              : "rv2-coverage-filter__btn"
          }
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
