import Link from "next/link";

import "./track-page.css";

export default function TrackLoading() {
  return (
    <div className="track-exhibit" aria-busy="true" aria-label="Loading song">
      <div className="track-exhibit__grain" aria-hidden />
      <header className="track-topbar">
        <Link href="/" className="track-logo" prefetch>
          Retroverse
        </Link>
        <span className="track-file-tag">Song File · …</span>
      </header>
      <section className="track-hero" aria-label="Loading song">
        <div className="track-hero__cover-wrap">
          <div className="track-hero__cover-fallback" aria-hidden />
        </div>
        <div className="track-hero__identity">
          <p className="track-hero__eyebrow">Now entering</p>
          <h1 className="track-hero__title">…</h1>
          <p className="track-hero__artist-line">
            <span className="track-hero__artist">Loading song file…</span>
          </p>
        </div>
      </section>
    </div>
  );
}
