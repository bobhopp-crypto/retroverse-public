import {
  isUsableChartHistory,
  normalizeArtistChartHistory,
} from "@/lib/artist/chart-history";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";

import { ArtistChartsHistoryClient } from "./artist-charts-history-client";

import "./artist-charts-history.css";

type Props = {
  artistName: string;
  history: ArtistChartHistory;
  highlightTrackIds?: string[];
  viewAllHref?: string;
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
    <ArtistChartsHistoryClient
      artistName={props.artistName}
      history={safe}
      highlightTrackIds={highlightTrackIds}
      viewAllHref={props.viewAllHref}
    />
  );
}
