import Link from "next/link";

import "./track-page.css";

export default function TrackLoading() {
  return (
    <div className="track-exhibit track-exhibit--sparse" aria-busy="true" aria-label="Loading song exhibit">
      <div className="track-exhibit__grain" aria-hidden />
      <header className="track-topbar">
        <Link href="/" className="track-logo" prefetch>
          Retroverse
        </Link>
        <span className="track-file-tag">Song</span>
      </header>
      <section className="track-hero" aria-label="Loading song">
        <div className="track-hero__cover-wrap">
          <div className="track-hero__cover-fallback" aria-hidden />
        </div>
        <div className="track-hero__identity">
          <p className="track-hero__eyebrow">From the archive</p>
          <h1 className="track-hero__title">…</h1>
          <p className="track-hero__artist-line">
            <span className="track-hero__artist">…</span>
          </p>
        </div>
      </section>

      <nav className="exhibit-footer-nav" aria-label="Site">
        <Link href="/" prefetch>
          Home
        </Link>
        <Link href="/search" prefetch>
          Search
        </Link>
      </nav>
    </div>
  );
}
