"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { formatChartDateLabel, monthLabel } from "@/lib/artist/chart-history-display";
import { MAX_RV_YEAR, MIN_RV_YEAR } from "@/lib/search/normalize-rv-year";
import {
  matchRvChronologyPath,
  rvMonthHref,
  rvWeekHref,
  rvYearHref,
} from "@/lib/rv/rv-chronology-paths";

import { RvChronologyScrollRestore } from "./rv-chronology-scroll-restore";

import "../[year]/rv-year.css";

type Props = {
  rvYear: number;
  fileTag: string;
  children: React.ReactNode;
};

export function RvChronologyChrome({ rvYear, fileTag, children }: Props) {
  const pathname = usePathname();
  const pathState = useMemo(() => matchRvChronologyPath(pathname), [pathname]);
  const pathMonth = pathState?.month ?? null;
  const pathWeek = pathState?.week ?? null;

  const searchHref = `/search?q=${encodeURIComponent(String(rvYear))}`;
  const prevYear = rvYear > MIN_RV_YEAR ? rvYear - 1 : null;
  const nextYear = rvYear < MAX_RV_YEAR ? rvYear + 1 : null;

  return (
    <div className="rv-year-world">
      <RvChronologyScrollRestore />
      <div className="rv-year-world__grain" aria-hidden />

      <header className="rv-year-topbar">
        <div className="rv-year-topbar__brand">
          <Link href="/" className="rv-year-logo" prefetch>
            Retroverse
          </Link>
          <span className="rv-year-file-tag">{fileTag}</span>
        </div>
        <div className="rv-year-topbar__actions">
          <Link href={searchHref} className="rv-year-topbar__action" prefetch>
            Search the archive
          </Link>
        </div>
      </header>

      <nav className="rv-year-nav" aria-label="Year navigation">
        {prevYear != null ? (
          <Link href={rvYearHref(prevYear)} prefetch className="rv-year-nav__link">
            ← {prevYear}
          </Link>
        ) : (
          <span className="rv-year-nav__link rv-year-nav__link--disabled" aria-hidden>
            ←
          </span>
        )}
        <Link href={rvYearHref(rvYear)} prefetch className="rv-year-nav__link">
          Year
        </Link>
        <Link href={searchHref} prefetch className="rv-year-nav__link rv-year-nav__link--explore">
          Search
        </Link>
        {nextYear != null ? (
          <Link href={rvYearHref(nextYear)} prefetch className="rv-year-nav__link">
            {nextYear} →
          </Link>
        ) : (
          <span className="rv-year-nav__link rv-year-nav__link--disabled" aria-hidden>
            →
          </span>
        )}
      </nav>

      {pathMonth != null ? (
        <nav className="rv-chronology-crumb" aria-label="Chronology trail">
          <Link href={rvYearHref(rvYear)} prefetch className="rv-chronology-crumb__link">
            {rvYear}
          </Link>
          <span className="rv-chronology-crumb__sep" aria-hidden>
            /
          </span>
          <Link
            href={rvMonthHref(rvYear, pathMonth)}
            prefetch
            className="rv-chronology-crumb__link"
          >
            {monthLabel(pathMonth)}
          </Link>
          {pathWeek ? (
            <>
              <span className="rv-chronology-crumb__sep" aria-hidden>
                /
              </span>
              <Link
                href={rvWeekHref(rvYear, pathMonth, pathWeek)}
                prefetch
                className="rv-chronology-crumb__link rv-chronology-crumb__link--current"
                aria-current="page"
              >
                {formatChartDateLabel(pathWeek)}
              </Link>
            </>
          ) : null}
        </nav>
      ) : null}

      {children}

      <footer className="rv-year-footer">
        <Link href="/">← Home</Link>
        <Link href={searchHref}>Search entities</Link>
        {prevYear != null ? <Link href={rvYearHref(prevYear)}>← {prevYear}</Link> : null}
        {nextYear != null ? <Link href={rvYearHref(nextYear)}>{nextYear} →</Link> : null}
      </footer>
    </div>
  );
}
