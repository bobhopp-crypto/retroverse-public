import Link from "next/link";

import { preflightHomePageEligibility } from "@/lib/ops/home-page-factory-eligibility";
import { loadTrackPage } from "@/lib/track/load-track-page";

import "./factory-homepage-preview.css";

type Props = {
  rvtr: string;
  artworkHref: string;
  title: string;
  artist: string;
  year: number | null;
  songHref?: string;
  artistHref?: string;
  albumTitle?: string | null;
  albumHref?: string | null;
  yearHref?: string | null;
  embedded?: boolean;
  fullPage?: boolean;
};

function BlockLink({
  href,
  className,
  label,
  children,
}: {
  href?: string | null;
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <div className={`${className} magazine-preview__link--static`} aria-label={label}>
        {children}
      </div>
    );
  }
  return (
    <Link href={href} prefetch={false} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

export function FactoryHomepagePreview({
  rvtr,
  artworkHref,
  title,
  artist,
  year,
  songHref,
  artistHref,
  albumTitle,
  albumHref,
  yearHref,
  embedded = false,
  fullPage = false,
}: Props) {
  const showAlbum = Boolean(albumTitle && albumHref);
  const yearLabel = year ? String(year) : "—";

  return (
    <div
      className={[
        "magazine-preview",
        embedded ? "magazine-preview--embedded" : "",
        fullPage ? "magazine-preview--route" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-rvtr={rvtr}
      aria-label="Mobile homepage magazine preview"
    >
      <div className="magazine-preview__search" aria-label="Search">
        <span className="magazine-preview__search-icon" aria-hidden>
          ⌕
        </span>
        <span className="magazine-preview__search-text">Search Retroverse</span>
      </div>

      <figure className="magazine-preview__hero-wrap" aria-label="Hero frame">
        {/* Real source frame only — no HTML text over the image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artworkHref} alt="" className="magazine-preview__hero" />
      </figure>

      <section className="magazine-preview__identity" aria-label="Song identity">
        <BlockLink href={songHref} className="magazine-preview__identity-song" label="Song">
          <strong className="magazine-preview__song-title">{title}</strong>
        </BlockLink>
        <BlockLink href={artistHref} className="magazine-preview__identity-artist" label="Artist">
          <span className="magazine-preview__artist-name">{artist}</span>
        </BlockLink>
        <div className="magazine-preview__identity-meta">
          {showAlbum ? (
            <BlockLink href={albumHref} className="magazine-preview__meta-album" label="Album">
              <span className="magazine-preview__meta-kicker">Album</span>
              <span className="magazine-preview__meta-value">{albumTitle}</span>
            </BlockLink>
          ) : (
            <div className="magazine-preview__meta-album magazine-preview__link--static" aria-label="Album">
              <span className="magazine-preview__meta-kicker">Album</span>
              <span className="magazine-preview__meta-value">—</span>
            </div>
          )}
          <span className="magazine-preview__meta-rule" aria-hidden />
          <BlockLink href={yearHref} className="magazine-preview__meta-year" label="Year">
            <span className="magazine-preview__meta-year-value">{yearLabel}</span>
          </BlockLink>
        </div>
      </section>

      <BlockLink href={songHref} className="magazine-preview__featured" label="Featured">
        <div className="magazine-preview__featured-visual" aria-hidden>
          <span className="magazine-preview__featured-glyph">▶</span>
        </div>
        <div className="magazine-preview__featured-copy">
          <span className="magazine-preview__section-kicker">Featured</span>
          <strong className="magazine-preview__featured-title">{title}</strong>
          <span className="magazine-preview__featured-action">Listen</span>
        </div>
      </BlockLink>

      <BlockLink href="/search" className="magazine-preview__upcoming" label="Upcoming">
        <div className="magazine-preview__upcoming-visual" aria-hidden>
          <span className="magazine-preview__upcoming-glyph">●</span>
        </div>
        <div className="magazine-preview__upcoming-copy">
          <span className="magazine-preview__section-kicker">Upcoming</span>
          <strong className="magazine-preview__upcoming-title">On Stage</strong>
          <span className="magazine-preview__upcoming-action">Watch</span>
        </div>
      </BlockLink>

      <footer className="magazine-preview__footer">
        <span className="magazine-preview__on-air">On Air</span>
        <span className="magazine-preview__live-now">Now Playing</span>
      </footer>
    </div>
  );
}

export async function loadFactoryHomepagePreviewProps(rvtrParam: string) {
  const rvtr = rvtrParam.toUpperCase();
  const track = await loadTrackPage(rvtr);
  const preflight = await preflightHomePageEligibility({
    rvtr,
    fileExists: true,
    isVideo: true,
    playCount: 1,
  });

  const albumTitle =
    preflight.canonical.albumResolved && preflight.canonical.albumHref
      ? track?.primaryAlbum?.title ?? null
      : null;
  const albumHref =
    preflight.canonical.albumResolved && preflight.canonical.albumHref
      ? preflight.canonical.albumHref
      : null;

  const heroHref = `/api/ops/issue-generation/hero-frame?rvtr=${rvtr}`;

  return {
    rvtr,
    artworkHref: heroHref,
    title: track?.title ?? "Song unavailable",
    artist: track?.artistName ?? "Artist unavailable",
    year: track?.releaseYear ?? null,
    songHref: preflight.canonical.songHref,
    artistHref: preflight.canonical.artistHref,
    albumTitle,
    albumHref,
    yearHref: preflight.canonical.yearHref,
  };
}
