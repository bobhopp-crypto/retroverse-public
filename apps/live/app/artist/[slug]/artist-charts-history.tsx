import { Suspense } from "react";

import {
  isUsableChartHistory,
  normalizeArtistChartHistory,
} from "@/lib/artist/chart-history";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";

import { ArtistChartsHistoryClient } from "./artist-charts-history-client";

import "./artist-charts-history.css";

type Props = {
  artistName: string;
  canonicalArtistId?: number | null;
  history: ArtistChartHistory;
  highlightTrackIds?: string[];
  viewAllHref?: string;
  coverageByRvtr?: Record<string, TrackCoverageStatus>;
};

/** Server wrapper — passes serialized chart history to the interactive client. */
export function ArtistChartsHistory(props: Props) {
  const normalized = normalizeArtistChartHistory(props.history, props.artistName);
  if (!normalized || !isUsableChartHistory(normalized)) return null;
  const safe = normalized;

  const highlightTrackIds = Array.isArray(props.highlightTrackIds)
    ? props.highlightTrackIds
    : [];

  return (
    <Suspense
      fallback={
        <div className="charts-history charts-history--loading-hold" aria-busy="true">
          <p className="charts-history__empty charts-history__empty--archival">
            Opening chart history…
          </p>
        </div>
      }
    >
      <ArtistChartsHistoryClient
        artistName={props.artistName}
        canonicalArtistId={props.canonicalArtistId}
        history={safe}
        highlightTrackIds={highlightTrackIds}
        viewAllHref={props.viewAllHref}
        coverageByRvtr={props.coverageByRvtr}
      />
    </Suspense>
  );
}
