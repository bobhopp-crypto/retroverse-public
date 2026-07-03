"use client";

import { ArtistChartsHistoryClient } from "@/app/artist/[slug]/artist-charts-history-client";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";

import { RvChronologyChrome } from "./rv-chronology-chrome";

type Props = {
  rvYear: number;
  history: ArtistChartHistory;
  initialMonth: number;
  highlightChartDate?: string | null;
  shellMode?: "legacy" | "rv2";
  coverageByRvtr?: Record<string, TrackCoverageStatus>;
};

export function RvChronologyDrill({
  rvYear,
  history,
  initialMonth,
  highlightChartDate = null,
  shellMode = "legacy",
  coverageByRvtr,
}: Props) {
  return (
    <RvChronologyChrome rvYear={rvYear} shellMode={shellMode}>
      <ArtistChartsHistoryClient
        artistName={`RV ${rvYear}`}
        history={history}
        highlightTrackIds={[]}
        hideBanner
        hideYearStep
        initialRvYear={rvYear}
        initialMonth={initialMonth}
        highlightChartDate={highlightChartDate}
        rvChronologyLeaders
        lockMonthNavigation
        coverageByRvtr={coverageByRvtr}
      />
    </RvChronologyChrome>
  );
}
