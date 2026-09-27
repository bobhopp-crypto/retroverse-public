import Link from "next/link";

import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import "./[slug]/artist-page-v1.css";

type Props = {
  name: string;
  songHref?: string | null;
};

/** Calm landing when a song has no canonical artist route yet. */
export function ArtistDepthFallback({ name, songHref }: Props) {
  const label = name.trim() || "This artist";

  return (
    <Rv2PublicShell className="rv2-artist rv2-explorer" activeNav="search" showTopBroadcastBanner={false}>
      <div className="explorer artist-v1">
        <header className="artist-v1__hero" aria-label={`${label} artist page`}>
          <RetroverseBack fallbackHref="/search" fallbackLabel="Search" className="explorer__back" />
          <div className="artist-v1__hero-main">
            <div className="artist-v1__identity">
              <p className="artist-v1__eyebrow">Artist</p>
              <h1 className="artist-v1__name">{label}</h1>
              <p className="artist-v1__tagline">Archive page still coming together.</p>
            </div>
          </div>
        </header>
        <section className="artist-v1__empty" aria-live="polite">
          <p className="artist-v1__empty-title">Still connecting</p>
          <p className="artist-v1__empty-body">
            {label} is on this song, and the canonical artist page is not linked yet.
          </p>
          <p className="artist-v1__empty-actions">
            {songHref ? (
              <Link href={songHref} prefetch className="artist-v1__empty-link">
                Back to the song →
              </Link>
            ) : null}
            <Link href={`/search?q=${encodeURIComponent(label)}`} prefetch className="artist-v1__empty-link">
              Search the archive →
            </Link>
          </p>
        </section>
      </div>
    </Rv2PublicShell>
  );
}
