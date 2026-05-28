import Link from "next/link";

import "../[year]/rv-year.css";

/** Stable RV chronology shell while route data loads — same chrome as drill pages. */
export function RvChronologyLoading({ label = "RV Chronicle" }: { label?: string }) {
  return (
    <div className="rv-year-world rv-year-world--loading" aria-busy="true" aria-label="Loading chart chronicle">
      <div className="rv-year-world__grain" aria-hidden />
      <header className="rv-year-topbar">
        <Link href="/" className="rv-year-logo" prefetch>
          Retroverse
        </Link>
        <span className="rv-year-file-tag">{label}</span>
      </header>
      <nav className="rv-year-nav" aria-hidden>
        <span className="rv-year-nav__link rv-year-nav__link--disabled">←</span>
        <span className="rv-year-nav__link">Year</span>
        <span className="rv-year-nav__link rv-year-nav__link--disabled">→</span>
      </nav>
      <section className="rv-year-hero rv-year-hero--loading">
        <p className="rv-year-hero__eyebrow">From the archive</p>
        <h1 className="rv-year-hero__year">…</h1>
        <p className="rv-year-hero__lead">Opening chart chronicle…</p>
      </section>
      <footer className="rv-year-footer">
        <Link href="/">← Home</Link>
        <Link href="/search">Search entities</Link>
      </footer>
    </div>
  );
}
