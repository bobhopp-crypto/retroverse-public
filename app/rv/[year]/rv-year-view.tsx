"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ArtistChartsHistoryClient } from "@/app/artist/[slug]/artist-charts-history-client";
import {
  isUsableChartHistory,
  normalizeArtistChartHistory,
} from "@/lib/artist/chart-history";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";
import { rvYearEditorial } from "@/lib/rv-year/rv-year-editorial";
import { rvYearStats } from "@/lib/rv-year/rv-year-stats";
import { MAX_RV_YEAR, MIN_RV_YEAR } from "@/lib/search/normalize-rv-year";

import "@/app/artist/[slug]/artist-charts-history.css";
import "./rv-year.css";

type RvYearViewProps = {
  rvYear: number;
  history: ArtistChartHistory;
};

export function RvYearView({ rvYear, history }: RvYearViewProps) {
  const artistName = `RV ${rvYear}`;
  const editorial = rvYearEditorial(rvYear);
  const searchHref = `/search?q=${encodeURIComponent(String(rvYear))}`;

  const safeHistory = useMemo(
    () => normalizeArtistChartHistory(history, artistName),
    [history, artistName],
  );

  const stats = useMemo(() => {
    if (!safeHistory) return null;
    return rvYearStats(safeHistory, rvYear);
  }, [safeHistory, rvYear]);

  if (!safeHistory || !isUsableChartHistory(safeHistory)) {
    return null;
  }

  const prevYear = rvYear > MIN_RV_YEAR ? rvYear - 1 : null;
  const nextYear = rvYear < MAX_RV_YEAR ? rvYear + 1 : null;
  const stackKey = `${rvYear}-${safeHistory.activeYears.join(",")}-${safeHistory.entries.length}`;

  return (
    <div className="rv-year-world">
      <div className="rv-year-world__grain" aria-hidden />

      <header className="rv-year-topbar">
        <div className="rv-year-topbar__brand">
          <Link href="/" className="rv-year-logo" prefetch>
            Retroverse
          </Link>
          <span className="rv-year-file-tag">RV Year · {rvYear}</span>
        </div>
        <div className="rv-year-topbar__actions">
          <Link href={searchHref} className="rv-year-topbar__action" prefetch>
            Search the archive
          </Link>
        </div>
      </header>

      <nav className="rv-year-nav" aria-label="Year navigation">
        {prevYear != null ? (
          <Link href={`/rv/${prevYear}`} prefetch className="rv-year-nav__link">
            ← {prevYear}
          </Link>
        ) : (
          <span className="rv-year-nav__link rv-year-nav__link--disabled" aria-hidden>
            ←
          </span>
        )}
        <Link href={searchHref} prefetch className="rv-year-nav__link rv-year-nav__link--explore">
          Search
        </Link>
        {nextYear != null ? (
          <Link href={`/rv/${nextYear}`} prefetch className="rv-year-nav__link">
            {nextYear} →
          </Link>
        ) : (
          <span className="rv-year-nav__link rv-year-nav__link--disabled" aria-hidden>
            →
          </span>
        )}
      </nav>

      <section className="rv-year-hero" aria-labelledby="rv-year-heading">
        <p className="rv-year-hero__eyebrow">Now entering</p>
        <h1 id="rv-year-heading" className="rv-year-hero__year">
          {rvYear}
        </h1>
        <p className="rv-year-hero__tagline">{editorial.tagline}</p>
        <p className="rv-year-hero__lead">{editorial.lead}</p>
        {stats ? (
          <ul className="rv-year-hero__stats" aria-label="Chart year facts">
            <li className="rv-year-hero__stat">{stats.activeMonths} active months</li>
            <li className="rv-year-hero__stat">Hot 100 + Album 200</li>
            <li className="rv-year-hero__stat">{stats.chartWeeks.toLocaleString()} chart weeks</li>
          </ul>
        ) : null}
      </section>

      <div className="rv-year-bridge">
        <h2 className="rv-year-bridge__title">Chart chronicle</h2>
        <p className="rv-year-bridge__hint">
          Pick a month — each week reveals who held #1. Tap a chart card to open the artist, album, or track exhibit.
        </p>
        <p className="rv-year-bridge__continuity">
          Shorthand direction: <strong>67</strong>, <strong>78</strong>, <strong>92</strong> map to RV year worlds.
          Use Search to continue into entities.
        </p>
      </div>

      <section className="rv-year-chronicle" aria-label={`${rvYear} chart chronicle`}>
        <ArtistChartsHistoryClient
          key={stackKey}
          artistName={artistName}
          history={safeHistory}
          highlightTrackIds={[]}
          hideBanner
          initialRvYear={rvYear}
        />
      </section>

      <footer className="rv-year-footer">
        <Link href="/">← Home</Link>
        <Link href={searchHref}>Search entities</Link>
        {prevYear != null ? <Link href={`/rv/${prevYear}`}>← {prevYear}</Link> : null}
        {nextYear != null ? <Link href={`/rv/${nextYear}`}>{nextYear} →</Link> : null}
      </footer>
    </div>
  );
}
