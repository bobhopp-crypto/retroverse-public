"use client";

import { ArtistChartsHistoryClient } from "@/app/artist/[slug]/artist-charts-history-client";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";

import { RvChronologyChrome } from "./rv-chronology-chrome";

type Props = {
  rvYear: number;
  history: ArtistChartHistory;
  initialMonth: number;
  highlightChartDate?: string | null;
  fileTag: string;
};

export function RvChronologyDrill({
  rvYear,
  history,
  initialMonth,
  highlightChartDate = null,
  fileTag,
}: Props) {
  return (
    <RvChronologyChrome rvYear={rvYear} fileTag={fileTag}>
      <section className="rv-year-chronicle charts-world-chronicle" aria-label={`${rvYear} chart weeks`}>
        <div className="rv-year-bridge charts-world-bridge">
          <h2 className="rv-year-bridge__title">Chart weeks</h2>
          <p className="rv-year-bridge__hint">
            Pick a month, then open a week card for artists, albums, and recordings.
          </p>
        </div>
        <ArtistChartsHistoryClient
          artistName={`RV ${rvYear}`}
          history={history}
          highlightTrackIds={[]}
          hideBanner
          hideYearStep
          initialRvYear={rvYear}
          initialMonth={initialMonth}
          highlightChartDate={highlightChartDate}
        />
      </section>
    </RvChronologyChrome>
  );
}
