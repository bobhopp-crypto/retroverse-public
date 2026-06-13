"use client";

import { ArtistChartsHistoryClient } from "@/app/artist/[slug]/artist-charts-history-client";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";

import { RvChronologyChrome } from "./rv-chronology-chrome";

type Props = {
  rvYear: number;
  history: ArtistChartHistory;
  initialMonth: number;
  highlightChartDate?: string | null;
};

export function RvChronologyDrill({
  rvYear,
  history,
  initialMonth,
  highlightChartDate = null,
}: Props) {
  return (
    <RvChronologyChrome rvYear={rvYear}>
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
      />
    </RvChronologyChrome>
  );
}
