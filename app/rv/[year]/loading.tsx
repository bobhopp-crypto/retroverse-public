import Link from "next/link";

import "./rv-year.css";

export default function RvYearLoading() {
  return (
    <div className="rv-year-world" aria-busy="true" aria-label="Loading RV year">
      <div className="rv-year-world__grain" aria-hidden />
      <header className="rv-year-topbar">
        <Link href="/" className="rv-year-logo" prefetch>
          Retroverse
        </Link>
        <span className="rv-year-file-tag">RV Year</span>
      </header>
      <section className="rv-year-hero">
        <p className="rv-year-hero__eyebrow">Now entering</p>
        <h1 className="rv-year-hero__year">…</h1>
        <p className="rv-year-hero__lead">Loading chart chronicle…</p>
      </section>
    </div>
  );
}
