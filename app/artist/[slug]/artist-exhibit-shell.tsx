import Link from "next/link";
import type { ReactNode } from "react";

import type { ArtistExhibitShellData } from "@/lib/artist/load-artist-exhibit-shell";

import { ArtistCover } from "./artist-cover";
import { ArtistExhibitNav } from "./artist-exhibit-nav";

type Props = {
  shell: ArtistExhibitShellData;
  children: ReactNode;
};

export function ArtistExhibitShell({ shell, children }: Props) {
  const { slug, displayName, fileCode, heroImageUrl } = shell;

  return (
    <div className="artist-exhibit">
      <div className="artist-exhibit__grain" aria-hidden />

      <header className="artist-topbar">
        <Link href="/" className="artist-logo" prefetch>
          Retroverse
        </Link>
        <span className="artist-file-tag">Artist File · {fileCode}</span>
      </header>

      <section className="artist-hero" aria-label={`${displayName} hero`}>
        {heroImageUrl ? (
          <ArtistCover
            src={heroImageUrl}
            alt=""
            className="artist-hero__photo"
            fallbackClassName="artist-hero__photo-fallback"
          />
        ) : (
          <div className="artist-hero__photo-fallback" aria-hidden />
        )}
        <span className="artist-hero__vinyl-deco" aria-hidden />
      </section>

      <div className="artist-hero__headline">
        <h1 className="artist-hero__name">{displayName}</h1>
      </div>

      <ArtistExhibitNav slug={slug} />

      <main className="artist-exhibit__main">{children}</main>

      <nav className="artist-footer-nav" aria-label="Site">
        <Link href="/" prefetch>
          Home
        </Link>
        <Link href="/search" prefetch>
          Search
        </Link>
        <Link href={`/inspect?q=${encodeURIComponent(displayName)}`} prefetch>
          Inspect
        </Link>
        <Link href={`/artist/${slug}`} prefetch>
          Artist
        </Link>
      </nav>
    </div>
  );
}
