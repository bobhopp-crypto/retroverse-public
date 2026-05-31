import Link from "next/link";

import "./chart-week-portal.css";

export default function ChartWeekPortalLoading() {
  return (
    <div className="chart-week-portal-world" aria-busy="true" aria-label="Loading chart week">
      <div className="chart-week-portal-world__grain" aria-hidden />
      <header className="chart-week-portal-topbar">
        <Link href="/" className="chart-week-portal-logo" prefetch>
          Retroverse
        </Link>
        <span className="chart-week-portal-tag">Chart week</span>
      </header>
      <section className="chart-week-portal-hero">
        <p className="chart-week-portal-hero__eyebrow">What surrounded this song?</p>
        <h1 className="chart-week-portal-hero__title">…</h1>
        <p className="chart-week-portal-hero__lead">Opening chart neighborhood…</p>
      </section>
    </div>
  );
}
