import type { Metadata } from "next";
import Link from "next/link";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { artistSectionHref } from "@/lib/artist/routes";
import { albumSuggestionHref } from "@/lib/search/entity-routes";
import { ARTIST_SLUGS } from "@/lib/artist/slug";

import { ArtistCover } from "./artist-cover";
import { ArtistSongsRotator } from "./artist-songs-rotator";
import { ArtistViewAll } from "./artist-view-all";

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

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug);

  const exhibitEmpty =
    data.essentialAlbums.length === 0 &&
    data.signatureTracks.length === 0 &&
    data.dominantYears.length === 0 &&
    !data.chartAlbumSpotlight &&
    data.relatedArtists.length === 0;

  if (exhibitEmpty) {
    const searchHref =
      data.exploreLinks.find((l) => l.label === "Search catalog")?.href ??
      `/search?q=${encodeURIComponent(data.displayName)}`;
    const inspectHref =
      data.exploreLinks.find((l) => l.label === "Inspect graph")?.href ??
      `/inspect?q=${encodeURIComponent(data.displayName)}`;

    return (
      <section className="artist-missing" aria-label="Nothing in the archive">
        <h2 className="artist-placeholder__title">Nothing in the archive yet</h2>
        <p className="artist-placeholder__note">
          {data.displayName} is on the list, but the archive is still indexing.
        </p>
        <p className="artist-placeholder__note">
          Try the catalog search or inspect the graph.
        </p>
        <p className="artist-placeholder__note">
          <Link href={searchHref} prefetch>
            Search catalog →
          </Link>{" "}
          ·{" "}
          <Link href={inspectHref} prefetch>
            Inspect graph →
          </Link>
        </p>
      </section>
    );
  }

  const maxYearCount = data.hasDominantYearData
    ? Math.max(...data.dominantYears.map((y) => y.count), 1)
    : 1;
  const libraryAlbums = data.essentialAlbums.slice(0, 8);
  const showLibrary = data.libraryTracks > 0 && libraryAlbums.length > 0;
  return (
    <>
      {data.essentialAlbums.length > 0 && (
        <section className="artist-shelf" aria-labelledby="essential-albums">
          <div className="artist-section-head artist-section-head--light">
            <h2 id="essential-albums">Albums</h2>
            <ArtistViewAll href={artistSectionHref(slug, "albums")} variant="light" />
          </div>
          <div className="artist-shelf__grid">
            {data.essentialAlbums.map((album) => {
              const href = albumSuggestionHref(
                album.title,
                album.rval ? `/albums/${album.rval}` : null,
              );
              if (!href) return null;
              return (
                <a key={album.pgAlbumId} className="artist-album-tile" href={href}>
                  <ArtistCover
                    src={album.coverUrl}
                    alt=""
                    className="artist-album-tile__cover"
                    fallbackClassName="artist-album-tile__fallback"
                    fallbackVariant="plate"
                    plateDensity="compact"
                    placeholderContext={{
                      rval: album.rval,
                      artist: data.displayName,
                      album: album.title,
                      releaseYear: album.releaseYear,
                    }}
                  />
                  <p className="artist-album-tile__title">{album.title}</p>
                  <p className="artist-album-tile__meta">{album.releaseYear ?? "—"}</p>
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
            <h2 id="artist-songs">Recordings</h2>
            <ArtistViewAll href={artistSectionHref(slug, "songs")} variant="dark" />
          </div>
          <ArtistSongsRotator
            tracks={data.signatureTracks}
            artistName={data.displayName}
          />
        </section>
      )}

      {data.hasDominantYearData && data.dominantYears.length > 0 && (
        <section className="artist-years" aria-labelledby="dominant-years">
          <div className="artist-section-head artist-section-head--aqua">
            <h2 id="dominant-years">Chart years</h2>
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
      )}

      {showLibrary && (
        <section className="artist-library" aria-labelledby="in-library">
          <div className="artist-section-head artist-section-head--light">
            <h2 id="in-library">Collected recordings</h2>
            <ArtistViewAll href={artistSectionHref(slug, "library")} variant="light" />
          </div>
          <div className="artist-library__grid">
            {libraryAlbums.map((a) => {
              const libHref = albumSuggestionHref(
                a.title,
                a.rval ? `/albums/${a.rval}` : null,
              );
              const thumb = (
                <ArtistCover
                  src={a.coverUrl}
                  alt=""
                  className="artist-library__thumb"
                  fallbackClassName="artist-library__thumb artist-album-tile__fallback"
                  fallbackVariant="plate"
                  plateDensity="compact"
                  placeholderContext={{
                    rval: a.rval,
                    artist: data.displayName,
                    album: a.title,
                    releaseYear: a.releaseYear,
                  }}
                />
              );
              return libHref ? (
                <Link
                  key={a.pgAlbumId}
                  href={libHref}
                  prefetch
                  className="artist-library__thumb-link"
                  aria-label={`${a.title} album`}
                >
                  {thumb}
                </Link>
              ) : (
                <div key={a.pgAlbumId}>{thumb}</div>
              );
            })}
          </div>
        </section>
      )}

      {data.chartAlbumSpotlight && (
        <section className="artist-era" aria-labelledby="chart-album">
          <div className="artist-section-head artist-section-head--light">
            <h2 id="chart-album" className="artist-era__title-inline">
              Chart album
            </h2>
            <ArtistViewAll href={artistSectionHref(slug, "albums")} variant="light" />
          </div>
          <p className="artist-era__facts">
            {data.chartAlbumSpotlight.albumTitle}
            {data.chartAlbumSpotlight.releaseYear != null
              ? ` · ${data.chartAlbumSpotlight.releaseYear}`
              : ""}
          </p>
          {(() => {
            const spotlight = data.chartAlbumSpotlight;
            const eraHref = spotlight.rval
              ? albumSuggestionHref(
                  spotlight.albumTitle,
                  `/albums/${spotlight.rval}`,
                )
              : null;
            const spotlightCover = (
              <ArtistCover
                src={spotlight.coverUrl}
                alt={spotlight.albumTitle}
                className="artist-era__cover"
                fallbackClassName="artist-era__cover artist-album-tile__fallback"
                fallbackVariant="plate"
                placeholderContext={{
                  rval: spotlight.rval,
                  artist: data.displayName,
                  album: spotlight.albumTitle,
                  releaseYear: spotlight.releaseYear,
                }}
              />
            );
            return (
              <>
                <div className="artist-era__cover-wrap">
                  {eraHref ? (
                    <Link href={eraHref} prefetch className="artist-era__cover-link">
                      {spotlightCover}
                    </Link>
                  ) : (
                    spotlightCover
                  )}
                </div>
                {eraHref ? (
                  <a className="artist-era__cta" href={eraHref}>
                    {spotlight.albumTitle}
                  </a>
                ) : null}
              </>
            );
          })()}
        </section>
      )}

      {data.relatedArtists.length > 0 && (
        <section className="artist-related" aria-labelledby="related-artists">
          <div className="artist-section-head artist-section-head--dark">
            <h2 id="related-artists">Related artists</h2>
            <ArtistViewAll href={artistSectionHref(slug, "related")} variant="dark" />
          </div>
          <ul className="artist-related__list">
            {data.relatedArtists.map((rel) => (
              <li key={rel.slug}>
                <Link href={`/artist/${rel.slug}`} prefetch className="artist-related__card">
                  <ArtistCover
                    src={rel.coverUrl}
                    alt=""
                    className="artist-related__avatar"
                    fallbackClassName="artist-related__avatar-fallback"
                    fallbackVariant="vinyl"
                    placeholderContext={{ artist: rel.name, album: rel.name }}
                  />
                  <span className="artist-related__name">{rel.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.exploreLinks.length > 0 && (
        <section className="artist-explore" aria-labelledby="explore-deeper">
          <div className="artist-section-head artist-section-head--dark">
            <h2 id="explore-deeper">Further in the archive</h2>
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
      )}
    </>
  );
}
