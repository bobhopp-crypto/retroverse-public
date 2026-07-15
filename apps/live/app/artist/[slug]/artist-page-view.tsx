import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { ArtistExplorerSongRows, type ArtistExplorerSongRow } from "@/app/artist/[slug]/artist-explorer-song-rows";
import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import type { ArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import type { ArtistPageData } from "@/lib/artist/types";
import { albumSuggestionHref } from "@/lib/search/entity-routes";
import { sortChartedSongsByPerformance } from "@/lib/songs/sort-charted-songs";
import { rvYearHref } from "@/lib/rv/rv-chronology-paths";

import "./artist-page-v1.css";

const TOP_SONGS_LIMIT = 12;
const ALBUMS_LIMIT = 6;

type Props = {
  data: ArtistPageData;
  coverage: ArtistCoverageSummary;
};

function buildIdentityLine(data: ArtistPageData): string | null {
  const parts: string[] = [];
  const { chartHighlights: h } = data;

  if (h.top10Hits > 0) {
    parts.push(`${h.top10Hits} top 10 song${h.top10Hits === 1 ? "" : "s"}`);
  } else if (h.hot100Appearances > 0) {
    parts.push(`${h.hot100Appearances} chart appearance${h.hot100Appearances === 1 ? "" : "s"}`);
  }

  if (h.b200Albums > 0) {
    parts.push(`${h.b200Albums} charting album${h.b200Albums === 1 ? "" : "s"}`);
  }

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function buildSongRows(data: ArtistPageData, coverage: ArtistCoverageSummary): ArtistExplorerSongRow[] {
  const coverByRvtr = new Map(
    data.signatureTracks
      .filter((t) => t.coverUrl)
      .map((t) => [t.rvtr.toUpperCase(), t.coverUrl!]),
  );

  const sorted = sortChartedSongsByPerformance(
    coverage.songs.map((song) => ({
      ...song,
      title: song.title,
      peakHot100: song.peakHot100,
      chartWeeks: song.chartWeeks,
      firstChartYear: song.firstChartYear,
      firstChartDate: song.firstChartDate,
    })),
  ).slice(0, TOP_SONGS_LIMIT);

  return sorted.map((song) => ({
    rvtr: song.rvtr,
    title: song.title,
    artistName: data.displayName,
    year: song.firstChartYear,
    peakHot100: song.peakHot100,
    coverUrl: coverByRvtr.get(song.rvtr.toUpperCase()) ?? data.heroImageUrl,
    trackHref: song.trackHref,
    coverageStatus: song.coverageStatus,
  }));
}

export function ArtistPageView({ data, coverage }: Props) {
  const songs = buildSongRows(data, coverage);
  const albums = data.essentialAlbums.slice(0, ALBUMS_LIMIT);
  const years = data.dominantYears.filter((y) => y.year >= 1960 && y.year <= 2030);
  const related = data.relatedArtists;
  const identityLine = buildIdentityLine(data);
  const activeRange = data.activeRange !== "—" ? data.activeRange : null;

  const heroFallbackCover =
    data.heroImageUrl ??
    albums.find((a) => a.coverUrl)?.coverUrl ??
    data.signatureTracks.find((t) => t.coverUrl)?.coverUrl ??
    null;

  const isSparse =
    songs.length === 0 &&
    albums.length === 0 &&
    years.length === 0 &&
    related.length === 0;

  return (
    <Rv2PublicShell className="rv2-artist rv2-explorer" activeNav="search">
      <div className="explorer artist-v1">
        <header className="artist-v1__hero" aria-label={`${data.displayName} artist page`}>
          <RetroverseBack
            fallbackHref="/search"
            fallbackLabel="Search"
            className="explorer__back"
          />

          <div className="artist-v1__hero-main">
            <div className="artist-v1__portrait-wrap">
              <ArtistCover
                src={data.heroImageUrl}
                alt=""
                className="artist-v1__portrait"
                fallbackClassName="artist-v1__portrait artist-v1__portrait--fallback"
                fallbackVariant="vinyl"
                placeholderContext={{
                  artist: data.displayName,
                  album: data.displayName,
                }}
              />
            </div>
            <div className="artist-v1__identity">
              <p className="artist-v1__eyebrow">Artist</p>
              <h1 className="artist-v1__name">{data.displayName}</h1>
              {identityLine ? <p className="artist-v1__tagline">{identityLine}</p> : null}
              {activeRange ? (
                <p className="artist-v1__meta-line">
                  <span className="artist-v1__meta-label">Active</span> {activeRange}
                </p>
              ) : null}
              <div className="artist-v1__hero-links" aria-label={`Explore ${data.displayName}`}>
                {songs.length > 0 ? (
                  <a href="#artist-top-songs" className="artist-v1__hero-link artist-v1__hero-link--primary">
                    Songs <span aria-hidden>↓</span>
                  </a>
                ) : null}
                {albums.length > 0 ? (
                  <a href="#artist-albums" className="artist-v1__hero-link">
                    Albums <span aria-hidden>↓</span>
                  </a>
                ) : null}
                <Link href={`/artist/${data.slug}/charts`} prefetch className="artist-v1__hero-link">
                  Chart journeys <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {isSparse ? (
          <section className="artist-v1__empty" aria-live="polite">
            <p className="artist-v1__empty-title">Still indexing</p>
            <p className="artist-v1__empty-body">
              {data.displayName} is in the archive, but chart and catalog links are still being connected.
            </p>
            <Link href="/" prefetch className="artist-v1__empty-link">
              Return to Live →
            </Link>
          </section>
        ) : null}

        {songs.length > 0 ? (
          <section className="artist-v1__section artist-v1__section--songs" aria-labelledby="artist-top-songs">
            <div className="artist-v1__section-heading">
              <div>
                <p className="artist-v1__section-kicker">Start here</p>
                <h2 id="artist-top-songs" className="artist-v1__section-title">
                  Songs that defined the run
                </h2>
              </div>
              <Link href={`/artist/${data.slug}/songs`} prefetch className="artist-v1__section-link">
                All songs <span aria-hidden>→</span>
              </Link>
            </div>
            <ArtistExplorerSongRows songs={songs} />
          </section>
        ) : null}

        {albums.length > 0 ? (
          <section className="artist-v1__section artist-v1__section--albums" aria-labelledby="artist-albums">
            <div className="artist-v1__section-heading">
              <div>
                <p className="artist-v1__section-kicker">Go deeper</p>
                <h2 id="artist-albums" className="artist-v1__section-title">
                  Albums to explore
                </h2>
              </div>
              <Link href={`/artist/${data.slug}/library`} prefetch className="artist-v1__section-link">
                Collected <span aria-hidden>→</span>
              </Link>
            </div>
            <ul className="artist-v1__album-shelf">
              {albums.map((album) => {
                const href = albumSuggestionHref(
                  album.title,
                  album.rval ? `/album/${album.rval}` : null,
                );
                if (!href) return null;
                return (
                  <li key={album.pgAlbumId}>
                    <Link href={href} prefetch className="artist-v1__album-card">
                      <ArtistCover
                        src={album.coverUrl ?? heroFallbackCover}
                        alt=""
                        className="artist-v1__album-art"
                        fallbackClassName="artist-v1__album-art artist-v1__album-art--fallback"
                        fallbackVariant="plate"
                        plateDensity="compact"
                        placeholderContext={{
                          artist: data.displayName,
                          album: album.title,
                          releaseYear: album.releaseYear,
                          rval: album.rval ?? undefined,
                        }}
                      />
                      <span className="artist-v1__album-title">{album.title}</span>
                      {album.releaseYear != null ? (
                        <span className="artist-v1__album-year">{album.releaseYear}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {years.length > 0 ? (
          <section className="artist-v1__section artist-v1__section--years" aria-labelledby="artist-years">
            <div className="artist-v1__section-heading">
              <div>
                <p className="artist-v1__section-kicker">Follow the momentum</p>
                <h2 id="artist-years" className="artist-v1__section-title">
                  Years in motion
                </h2>
              </div>
              <Link href={`/artist/${data.slug}/charts`} prefetch className="artist-v1__section-link">
                Chart journeys <span aria-hidden>→</span>
              </Link>
            </div>
            <ul className="artist-v1__year-pills">
              {years.map((bar) => (
                <li key={bar.year}>
                  <Link href={rvYearHref(bar.year)} prefetch className="artist-v1__year-pill">
                    <span className="artist-v1__year-value">{bar.year}</span>
                    {bar.count > 0 ? (
                      <span className="artist-v1__year-count">{bar.count} chart weeks</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="artist-v1__section artist-v1__section--related" aria-labelledby="artist-related">
            <div className="artist-v1__section-heading">
              <div>
                <p className="artist-v1__section-kicker">Keep exploring</p>
                <h2 id="artist-related" className="artist-v1__section-title">Keep exploring</h2>
              </div>
            </div>
            <ul className="artist-v1__related-list">
              {related.map((rel) => (
                <li key={rel.slug}>
                  <Link href={`/artist/${rel.slug}`} prefetch className="artist-v1__related-card">
                    <ArtistCover
                      src={rel.coverUrl}
                      alt=""
                      className="artist-v1__related-art"
                      fallbackClassName="artist-v1__related-art artist-v1__related-art--fallback"
                      fallbackVariant="vinyl"
                      placeholderContext={{ artist: rel.name, album: rel.name }}
                    />
                    <span className="artist-v1__related-name">{rel.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="artist-v1__footer">
          <Link href="/search" prefetch className="artist-v1__footer-link">
            Explore more artists <span aria-hidden>→</span>
          </Link>
        </footer>
      </div>
    </Rv2PublicShell>
  );
}
