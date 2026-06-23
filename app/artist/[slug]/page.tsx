import type { Metadata } from "next";
import Link from "next/link";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadArtistChartedSongs } from "@/lib/artist/load-artist-charted-songs";
import { artistSectionHref } from "@/lib/artist/routes";
import { albumSuggestionHref } from "@/lib/search/entity-routes";
import { sortChartedSongsByDate } from "@/lib/songs/sort-charted-songs";
import { ARTIST_SLUGS } from "@/lib/artist/slug";

import { ArtistAlbumTile } from "./artist-album-tile";
import { ArtistChartActivity } from "./artist-chart-activity";
import { ArtistCover } from "./artist-cover";
import { ArtistViewAll } from "./artist-view-all";
import { ChartHistorySongList } from "@/app/components/chart-history-song-list";

const EXHIBIT_SINGLES_LIMIT = 8;
const EXHIBIT_ALBUMS_LIMIT = 7;

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
      ? `${data.displayName} — charted songs, albums, and chart activity in Retroverse.`
      : undefined,
  };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const [data, chartedSongs] = await Promise.all([
    loadArtistPage(slug),
    loadArtistChartedSongs(slug),
  ]);

  const exhibitEmpty =
    data.essentialAlbums.length === 0 &&
    chartedSongs.songs.length === 0 &&
    data.chartDecades.length === 0 &&
    data.relatedArtists.length === 0;

  if (exhibitEmpty) {
    const artistHref = `/artist/${slug}`;

    return (
      <section className="artist-missing" aria-label="Nothing in the archive">
        <h2 className="artist-placeholder__title">Nothing in the archive yet</h2>
        <p className="artist-placeholder__note">
          {data.displayName} is on the list, but the archive is still indexing.
        </p>
        <p className="artist-placeholder__note">
          <Link href={artistHref} prefetch>
            Artist exhibit →
          </Link>{" "}
          ·{" "}
          <Link href="/" prefetch>
            Home →
          </Link>
        </p>
      </section>
    );
  }

  const songsHref = artistSectionHref(slug, "songs");
  const albumsHref = artistSectionHref(slug, "albums");
  const exhibitSingles = sortChartedSongsByDate(chartedSongs.songs);
  const exhibitAlbums = data.essentialAlbums.slice(0, EXHIBIT_ALBUMS_LIMIT);

  return (
    <>
      {exhibitSingles.length > 0 ? (
        <section className="artist-exhibit-songs" aria-labelledby="artist-singles-hub">
          <div className="artist-section-head artist-section-head--songs">
            <h2 id="artist-singles-hub">Singles</h2>
          </div>
          <ChartHistorySongList
            artistName={data.displayName}
            artistSlug={data.slug}
            songs={exhibitSingles}
            mode="embed"
            previewLimit={EXHIBIT_SINGLES_LIMIT}
            songsHref={songsHref}
            moreLabel="All songs →"
          />
        </section>
      ) : null}

      {exhibitAlbums.length > 0 ? (
        <section className="artist-shelf" aria-labelledby="artist-albums-hub">
          <div className="artist-section-head artist-section-head--light">
            <h2 id="artist-albums-hub">Albums</h2>
          </div>
          <div className="artist-shelf__grid">
            {exhibitAlbums.map((album) => {
              const href = albumSuggestionHref(
                album.title,
                album.rval ? `/albums/${album.rval}` : null,
              );
              if (!href) return null;
              return (
                <ArtistAlbumTile
                  key={album.pgAlbumId}
                  pgAlbumId={album.pgAlbumId}
                  title={album.title}
                  releaseYear={album.releaseYear}
                  rval={album.rval}
                  coverUrl={album.coverUrl}
                  artistName={data.displayName}
                  href={href}
                />
              );
            })}
          </div>
          <Link href={albumsHref} prefetch className="artist-exhibit-footer">
            All albums →
          </Link>
        </section>
      ) : null}

      <ArtistChartActivity slug={slug} decades={data.chartDecades} />

      {data.relatedArtists.length > 0 ? (
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
      ) : null}

      {data.exploreLinks.length > 0 ? (
        <section className="artist-explore" aria-labelledby="explore-deeper">
          <div className="artist-section-head artist-section-head--dark">
            <h2 id="explore-deeper">Further exploration</h2>
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
      ) : null}
    </>
  );
}
