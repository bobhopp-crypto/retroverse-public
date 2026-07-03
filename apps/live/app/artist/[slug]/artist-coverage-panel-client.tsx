"use client";

import type { CoverageSummaryMetrics } from "@/lib/charts/coverage-summary";

import { ArtistCoveragePanel } from "./artist-coverage-panel";

type Props = {
  displayName: string;
  slug: string;
  summary: CoverageSummaryMetrics;
};

/** Read-only coverage header for chart history pages. */
export function ArtistCoveragePanelClient({ displayName, slug, summary }: Props) {
  return (
    <ArtistCoveragePanel
      displayName={displayName}
      summary={summary}
      showMissingOnly={false}
      onToggleMissing={() => {
        window.location.href = `/artist/${slug}/songs`;
      }}
    />
  );
}
