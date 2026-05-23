"use client";

import { useEffect, useMemo } from "react";

import { ArtistChartsHistoryClient } from "@/app/artist/[slug]/artist-charts-history-client";
import {
  isUsableChartHistory,
  normalizeArtistChartHistory,
} from "@/lib/artist/chart-history";
import { activeMonthsInYear } from "@/lib/artist/chart-history-display";
import type { SearchChartHistoryContext } from "@/lib/search/load-search-chart-history";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";

import "@/app/artist/[slug]/artist-charts-history.css";

type Props = {
  context: SearchChartHistoryContext;
  title?: string;
  viewAllLabel?: string;
  initialRvYear?: number | null;
};

/** Search results — RV History (year-aware queries only). */
export function SearchChartsHistoryPanel({
  context,
  title = "RV HISTORY",
  viewAllLabel = "View RV history →",
  initialRvYear = null,
}: Props) {
  const resolvedRvYear = normalizeRVYear(initialRvYear);
  const artistName =
    typeof context?.artistName === "string" ? context.artistName : "Artist";
  const viewAllHref = typeof context?.viewAllHref === "string" ? context.viewAllHref : "#";
  const highlightTrackIds = Array.isArray(context?.highlightTrackIds)
    ? context.highlightTrackIds
    : [];

  const history = useMemo(() => {
    if (!context?.history) return null;
    return normalizeArtistChartHistory(context.history, artistName);
  }, [context?.history, artistName]);

  const mountStats = useMemo(() => {
    if (!history || !isUsableChartHistory(history)) return null;
    const years = history.activeYears;
    const latestYear = years.length > 0 ? years[years.length - 1]! : null;
    const months =
      latestYear != null ? activeMonthsInYear(history.entries, latestYear) : [];
    return { years, months, cards: history.entries.length };
  }, [history]);

  useEffect(() => {
    if (!mountStats) return;
    console.log("[search charts mounted]", {
      hasChartHistory: true,
      years: mountStats.years,
      months: mountStats.months,
      cards: mountStats.cards,
    });
  }, [mountStats]);

  if (!history || !isUsableChartHistory(history)) {
    return null;
  }

  const stackKey = `${artistName}-${history.activeYears.join(",")}-${history.entries.length}`;

  return (
    <section
      className="search-charts-history"
      data-charts-ui="chart-history"
      aria-labelledby="search-charts-heading"
    >
      <div className="search-charts-history__header">
        <h2 id="search-charts-heading" className="search-charts-history__title">
          {title}
        </h2>
        <a className="search-charts-history__view-all" href={viewAllHref}>
          {viewAllLabel}
        </a>
      </div>

      <div className="search-charts-history__stack">
        <ArtistChartsHistoryClient
          key={`${stackKey}-${initialRvYear ?? "none"}`}
          artistName={artistName}
          history={history}
          highlightTrackIds={highlightTrackIds}
          hideBanner
          initialRvYear={resolvedRvYear}
        />
      </div>
    </section>
  );
}
