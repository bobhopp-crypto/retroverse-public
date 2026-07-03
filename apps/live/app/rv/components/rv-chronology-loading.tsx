import Link from "next/link";

import { RvPublicMasthead } from "./rv-public-masthead";
import { RvYearNavBand } from "./rv-year-nav-band";

import "../[year]/rv-year.css";

/** Stable RV chronology shell while route data loads — same chrome as drill pages. */
export function RvChronologyLoading({ rvYear = 1971 }: { rvYear?: number; label?: string }) {
  return (
    <div className="rv-year-world rv-year-world--loading" aria-busy="true" aria-label="Loading">
      <div className="rv-year-world__grain" aria-hidden />
      <RvPublicMasthead searchQuery={String(rvYear)} />
      <section className="rv-year-hero rv-year-hero--loading">
        <p className="rv-year-hero__label">Year</p>
        <h1 className="rv-year-hero__year">…</h1>
        <h2 className="rv-year-hero__headline">Loading the story…</h2>
        <p className="rv-year-hero__lead">One moment while we pull together the music from this year.</p>
      </section>
      <RvYearNavBand rvYear={rvYear} showYearHome />
      <footer className="rv-year-footer">
        <Link href="/">← Home</Link>
        <Link href="/search">Search music</Link>
      </footer>
    </div>
  );
}
