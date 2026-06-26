"use client";

import type { CoverageSummaryMetrics } from "@/lib/charts/coverage-summary";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";

import { TrackCoverageBadge } from "@/app/components/track-coverage-badge";

import "./artist-coverage-panel.css";

type Props = {
  displayName: string;
  summary: CoverageSummaryMetrics;
  showMissingOnly: boolean;
  onToggleMissing: () => void;
};

export function ArtistCoveragePanel({
  displayName,
  summary,
  showMissingOnly,
  onToggleMissing,
}: Props) {
  return (
    <section className="artist-coverage-panel" aria-label={`${displayName} collection coverage`}>
      <p className="artist-coverage-panel__eyebrow">Hot 100 collection</p>
      <div className="artist-coverage-panel__metrics">
        <div>
          <span className="artist-coverage-panel__value">{summary.owned}</span>
          <span className="artist-coverage-panel__label">Owned</span>
        </div>
        <div>
          <span className="artist-coverage-panel__value">{summary.youtube}</span>
          <span className="artist-coverage-panel__label">YouTube</span>
        </div>
        <div>
          <span className="artist-coverage-panel__value">{summary.missing}</span>
          <span className="artist-coverage-panel__label">Missing</span>
        </div>
        <div>
          <span className="artist-coverage-panel__value">{summary.coveragePct}%</span>
          <span className="artist-coverage-panel__label">Coverage</span>
        </div>
      </div>
      <button
        type="button"
        className={`artist-coverage-panel__filter${showMissingOnly ? " artist-coverage-panel__filter--active" : ""}`}
        onClick={onToggleMissing}
      >
        {showMissingOnly ? "Showing missing songs" : "Show missing songs →"}
      </button>
    </section>
  );
}

export function ArtistCoverageBadgeInline({ status }: { status: TrackCoverageStatus }) {
  return <TrackCoverageBadge status={status} />;
}
