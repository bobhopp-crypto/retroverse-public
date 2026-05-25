import Link from "next/link";

import "./artist-page.css";

export default function ArtistLoading() {
  return (
    <div className="artist-exhibit" aria-busy="true" aria-label="Loading artist">
      <div className="artist-exhibit__grain" aria-hidden />
      <header className="artist-topbar">
        <Link href="/" className="artist-logo" prefetch>
          Retroverse
        </Link>
        <span className="artist-file-tag">Artist File · …</span>
      </header>
      <section className="artist-hero" aria-label="Loading artist">
        <div className="artist-hero__photo-fallback" aria-hidden />
        <span className="artist-hero__vinyl-deco" aria-hidden />
      </section>
      <div className="artist-hero__headline">
        <h1 className="artist-hero__name">…</h1>
        <p className="artist-section-head">Loading artist file…</p>
      </div>
    </div>
  );
}
