import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { artistSectionHref } from "@/lib/artist/routes";
import { albumSuggestionHref } from "@/lib/search/entity-routes";
import { ARTIST_SLUGS } from "@/lib/artist/slug";

import { ArtistCover } from "./artist-cover";
import { ArtistChartsHistory } from "./artist-charts-history";
import { ArtistSongsRotator } from "./artist-songs-rotator";
import { ArtistViewAll } from "./artist-view-all";
import "./artist-page.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return Object.keys(ARTIST_SLUGS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArtistPage(slug);
  return {
    title: data ? `${data.displayName} — Retroverse` : "Artist — Retroverse",
    description: data
      ? `${data.displayName} — albums, songs, and years in Retroverse.`
      : undefined,
  };
}

function formatAlbumPeak(peak: number | null): string {
  if (peak == null) return "";
  return ` · #${peak} Peak`;
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug);
  if (!data) notFound();

  const maxYearCount = Math.max(...data.dominantYears.map((y) => y.count), 1);
  const libraryAlbumCovers = data.essentialAlbums.filter((a) => a.coverUrl).slice(0, 8);

  return (
    <div className="artist-exhibit">
      <div className="artist-exhibit__grain" aria-hidden />

      <header className="artist-topbar">
        <Link href="/" className="artist-logo">
          Retroverse
        </Link>
        <span className="artist-file-tag">Artist File · {data.fileCode}</span>
      </header>

      <section className="artist-hero" aria-label={`${data.displayName} hero`}>
        {data.heroImageUrl ? (
          <ArtistCover
            src={data.heroImageUrl}
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
        <h1 className="artist-hero__name">{data.displayName}</h1>
      </div>

      {data.essentialAlbums.length > 0 && (
        <section className="artist-shelf" aria-labelledby="essential-albums">
          <div className="artist-section-head artist-section-head--light">
            <h2 id="essential-albums">Essential Albums</h2>
            <ArtistViewAll href={artistSectionHref(slug, "albums")} variant="light" />
          </div>
          <div className="artist-shelf__scroll">
            {data.essentialAlbums.map((album) => {
              const href = albumSuggestionHref(
                album.title,
                album.rval ? `/albums/${album.rval}` : null,
              );
              return (
                <a key={album.pgAlbumId} className="artist-album-tile" href={href}>
                  <ArtistCover
                    src={album.coverUrl}
                    alt=""
                    className="artist-album-tile__cover"
                    fallbackClassName="artist-album-tile__fallback"
                  />
                  <p className="artist-album-tile__title">{album.title}</p>
                  <p className="artist-album-tile__meta">
                    {album.releaseYear ?? "—"}
                    {formatAlbumPeak(album.b200Peak)}
                  </p>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {data.signatureTracks.length > 0 && (
        <section
          className="artist-songs-panel"
          data-songs-ui="song-stack"
          aria-labelledby="artist-songs"
        >
          <div className="artist-section-head artist-section-head--songs">
            <h2 id="artist-songs">Songs</h2>
            <ArtistViewAll href={artistSectionHref(slug, "tracks")} variant="dark" />
          </div>
          <ArtistSongsRotator
            tracks={data.signatureTracks}
            artistName={data.displayName}
          />
        </section>
      )}

      <section className="artist-years" aria-labelledby="dominant-years">
        <div className="artist-section-head artist-section-head--aqua">
          <h2 id="dominant-years">Dominant Years</h2>
          <ArtistViewAll href={artistSectionHref(slug, "years")} variant="dark" />
        </div>
        <div className="artist-years__chart">
          {data.dominantYears.map((bar) => (
            <div key={bar.year} className="artist-years__bar-wrap">
              <div
                className="artist-years__bar"
                style={{ height: `${Math.round((bar.count / maxYearCount) * 100)}%` }}
              />
              <span className="artist-years__label">{bar.year}</span>
            </div>
          ))}
        </div>
      </section>

      {(data.libraryTracks > 0 || libraryAlbumCovers.length > 0) && (
        <section className="artist-library" aria-labelledby="in-library">
          <div className="artist-section-head artist-section-head--light">
            <h2 id="in-library">In Your Library</h2>
            <ArtistViewAll href={artistSectionHref(slug, "library")} variant="light" />
          </div>
          <p className="artist-library__count">
            {data.libraryTracks} songs · {data.libraryAlbums} albums
          </p>
          <div className="artist-library__scroll">
            {libraryAlbumCovers.map((a) => (
              <ArtistCover
                key={a.pgAlbumId}
                src={a.coverUrl}
                alt=""
                className="artist-library__thumb"
                fallbackClassName="artist-library__thumb artist-album-tile__fallback"
              />
            ))}
          </div>
        </section>
      )}

      {data.chartAlbumSpotlight && (
        <section className="artist-era" aria-labelledby="chart-album">
          <div className="artist-section-head artist-section-head--light">
            <h2 id="chart-album" className="artist-era__title-inline">
              Top Album
            </h2>
            <ArtistViewAll href={artistSectionHref(slug, "albums")} variant="light" />
          </div>
          <p className="artist-era__facts">
            {data.chartAlbumSpotlight.albumTitle}
            {data.chartAlbumSpotlight.releaseYear != null
              ? ` · ${data.chartAlbumSpotlight.releaseYear}`
              : ""}
            {data.chartAlbumSpotlight.b200Peak != null
              ? ` · #${data.chartAlbumSpotlight.b200Peak} Peak`
              : ""}
            {data.chartAlbumSpotlight.rval ? ` · ${data.chartAlbumSpotlight.rval}` : ""}
          </p>
          <div className="artist-era__cover-wrap">
            <ArtistCover
              src={data.chartAlbumSpotlight.coverUrl}
              alt={data.chartAlbumSpotlight.albumTitle}
              className="artist-era__cover"
              fallbackClassName="artist-era__cover artist-album-tile__fallback"
            />
          </div>
          {data.chartAlbumSpotlight.rval ? (
            <a
              className="artist-era__cta"
              href={albumSuggestionHref(
                data.chartAlbumSpotlight.albumTitle,
                `/albums/${data.chartAlbumSpotlight.rval}`,
              )}
            >
              Open album →
            </a>
          ) : null}
        </section>
      )}

      {data.chartHistory ? (
        <ArtistChartsHistory
          artistName={data.displayName}
          history={data.chartHistory}
          highlightTrackIds={data.signatureTracks.map((t) => t.rvtr)}
          viewAllHref={artistSectionHref(slug, "charts")}
        />
      ) : null}

      {data.relatedArtists.length > 0 && (
        <section className="artist-related" aria-labelledby="related-artists">
          <div className="artist-section-head artist-section-head--dark">
            <h2 id="related-artists">Related Artists</h2>
            <ArtistViewAll href={artistSectionHref(slug, "related")} variant="dark" />
          </div>
          <div className="artist-related__row">
            {data.relatedArtists.map((rel) => (
              <Link key={rel.slug} href={`/artist/${rel.slug}`} className="artist-related__circle">
                {rel.coverUrl ? (
                  <ArtistCover
                    src={rel.coverUrl}
                    alt=""
                    className="artist-related__avatar"
                    fallbackClassName="artist-related__avatar-fallback"
                  />
                ) : (
                  <span className="artist-related__avatar-fallback" aria-hidden />
                )}
                <span className="artist-related__name">{rel.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="artist-explore" aria-labelledby="explore-deeper">
        <div className="artist-section-head artist-section-head--dark">
          <h2 id="explore-deeper">Explore Deeper</h2>
          <ArtistViewAll href={artistSectionHref(slug, "explore")} variant="dark" />
        </div>
        <div className="artist-explore__pills">
          {data.exploreLinks.map((link, index) => (
            <a
              key={`${link.href}-${link.label}-${index}`}
              href={link.href}
              className="artist-explore__pill"
            >
              {link.label}
            </a>
          ))}
        </div>
      </section>

      <nav className="artist-footer-nav" aria-label="Site">
        <Link href="/">Home</Link>
        <Link href="/search">Search</Link>
        <Link href={`/inspect?q=${encodeURIComponent(data.displayName)}`}>Inspect</Link>
        <Link href={`/artist/${slug}`}>Artist</Link>
      </nav>
    </div>
  );
}
