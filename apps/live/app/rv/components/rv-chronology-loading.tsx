import Link from "next/link";

import { RV_CHRONOLOGY_DEFAULT_YEAR } from "@/lib/rv/rv-chronology-paths";

import { RvPublicMasthead } from "./rv-public-masthead";
import { RvYearNavBand } from "./rv-year-nav-band";

import "../[year]/rv-year.css";
import "./rv-rv2-overrides.css";

type Props = {
  rvYear?: number;
  label?: string;
  shellMode?: "legacy" | "rv2";
};

/** Stable RV chronology shell while route data loads — matches active page chrome. */
export function RvChronologyLoading({
  rvYear = RV_CHRONOLOGY_DEFAULT_YEAR,
  shellMode = "rv2",
}: Props) {
  return (
    <div
      className={`rv-year-world rv-year-world--loading${shellMode === "rv2" ? " rv-year-world--rv2" : ""}`}
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="rv-year-world__grain" aria-hidden />
      {shellMode === "legacy" ? <RvPublicMasthead searchQuery={String(rvYear)} /> : null}
      <section className="rv-year-hero rv-year-hero--loading">
        <p className="rv-year-hero__label">Year</p>
        <h1 className="rv-year-hero__year">…</h1>
        <h2 className="rv-year-hero__headline">Loading the story…</h2>
        <p className="rv-year-hero__lead">One moment while we pull together the music from this year.</p>
      </section>
      <RvYearNavBand rvYear={rvYear} showYearHome />
      {shellMode === "legacy" ? (
        <footer className="rv-year-footer">
          <Link href="/">← Home</Link>
          <Link href="/search">Search music</Link>
        </footer>
      ) : null}
    </div>
  );
}
