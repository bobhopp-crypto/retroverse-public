import Link from "next/link";

import { MAX_RV_YEAR, MIN_RV_YEAR } from "@/lib/search/normalize-rv-year";
import { rvYearHref } from "@/lib/rv/rv-chronology-paths";

type Props = {
  rvYear: number;
  /** When set, center link returns to the year overview. */
  showYearHome?: boolean;
};

export function RvYearNavBand({ rvYear, showYearHome = false }: Props) {
  const prevYear = rvYear > MIN_RV_YEAR ? rvYear - 1 : null;
  const nextYear = rvYear < MAX_RV_YEAR ? rvYear + 1 : null;

  return (
    <nav className="rv-year-nav rv-year-nav--secondary" aria-label="Year navigation">
      {prevYear != null ? (
        <Link href={rvYearHref(prevYear)} prefetch className="rv-year-nav__link">
          ← {prevYear}
        </Link>
      ) : (
        <span className="rv-year-nav__link rv-year-nav__link--disabled" aria-hidden>
          ←
        </span>
      )}
      {showYearHome ? (
        <Link href={rvYearHref(rvYear)} prefetch className="rv-year-nav__link rv-year-nav__link--year">
          {rvYear}
        </Link>
      ) : (
        <span className="rv-year-nav__label" aria-hidden>
          {rvYear}
        </span>
      )}
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
  );
}
