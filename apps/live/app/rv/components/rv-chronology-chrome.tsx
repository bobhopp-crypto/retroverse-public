"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { formatChartDateLabel, monthLabel } from "@/lib/artist/chart-history-display";
import {
  matchRvChronologyPath,
  rvMonthHref,
  rvWeekHref,
  rvYearHref,
} from "@/lib/rv/rv-chronology-paths";

import { RvChronologyScrollRestore } from "./rv-chronology-scroll-restore";
import { RvPublicMasthead } from "./rv-public-masthead";
import { RvYearNavBand } from "./rv-year-nav-band";

import "../[year]/rv-year.css";

type Props = {
  rvYear: number;
  children: React.ReactNode;
  shellMode?: "legacy" | "rv2";
};

export function RvChronologyChrome({ rvYear, children, shellMode = "legacy" }: Props) {
  const pathname = usePathname();
  const pathState = useMemo(() => matchRvChronologyPath(pathname), [pathname]);
  const pathMonth = pathState?.month ?? null;
  const pathWeek = pathState?.week ?? null;

  const searchHref = rvYearHref(rvYear);
  const backHref = pathMonth != null
    ? pathWeek
      ? rvMonthHref(rvYear, pathMonth)
      : rvYearHref(rvYear)
    : "/search";
  const backLabel = pathMonth != null && pathWeek
    ? `${monthLabel(pathMonth)} ${rvYear}`
    : pathMonth != null
      ? String(rvYear)
      : "Search";

  return (
    <div className={`rv-year-world${shellMode === "rv2" ? " rv-year-world--rv2" : ""}`}>
      <RvChronologyScrollRestore />
      <div className="rv-year-world__grain" aria-hidden />

      {shellMode === "legacy" ? <RvPublicMasthead searchQuery={String(rvYear)} /> : null}

      <RetroverseBack
        fallbackHref={backHref}
        fallbackLabel={backLabel}
        className="rv-chronology-back"
      />

      {pathMonth != null ? (
        <nav className="rv-chronology-crumb" aria-label="Where you are">
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

      <RvYearNavBand rvYear={rvYear} showYearHome />

      {shellMode === "legacy" ? (
        <footer className="rv-year-footer">
          <Link href="/">← Home</Link>
          <Link href={searchHref}>Search music</Link>
        </footer>
      ) : null}
    </div>
  );
}
