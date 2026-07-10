"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  isUsableChartHistory,
  normalizeArtistChartHistory,
} from "@/lib/artist/chart-history";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";
import {
  formatChartDateLabel,
  isAlbumChartSnapshot,
  monthChartSnapshotGroups,
  monthLabel,
  weeklyEntriesFromHistory,
} from "@/lib/artist/chart-history-display";
import { formatRvYearArtist, formatRvYearTitle } from "@/lib/rv-year/display-format";
import { rvYearEditorial } from "@/lib/rv-year/rv-year-editorial";
import type { RvYearDestination, YearChartLeader } from "@/lib/rv-year/rv-year-destination";
import { rvMonthHref, rvWeekHref } from "@/lib/rv/rv-chronology-paths";

import { RvChronologyScrollRestore } from "../components/rv-chronology-scroll-restore";
import { RvYearCover } from "../components/rv-year-cover";
import { RvPublicMasthead } from "../components/rv-public-masthead";
import { RvYearNavBand } from "../components/rv-year-nav-band";
import "@/app/artist/[slug]/artist-charts-history.css";
import "@/app/public-mobile-width.css";
import "./rv-year.css";

type RvYearViewProps = {
  rvYear: number;
  history: ArtistChartHistory;
  destination: RvYearDestination;
  /** When `rv2`, hide legacy masthead/footer (shell owns chrome). */
  shellMode?: "legacy" | "rv2";
};

function monthFullName(month: number): string {
  const d = new Date(2000, Math.max(0, Math.min(11, month - 1)), 1);
  return d.toLocaleString("en-US", { month: "long" });
}

function useMobileTimeline() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function renderChartLeaders(
  id: string,
  title: string,
  kicker: string,
  leaders: YearChartLeader[],
) {
  if (!leaders.length) return null;

  return (
    <section
      className="rv-year-section rv-year-section--chart-primary"
      aria-labelledby={id}
    >
      <p className="rv-year-section__kicker">{kicker}</p>
      <h2 id={id} className="rv-year-section__title">
        {title}
      </h2>
      <ol className="rv-year-chart-leaders">
        {leaders.map((leader, index) => {
          const weeksLabel =
            leader.weeksAtOne === 1
              ? "1 week at #1"
              : `${leader.weeksAtOne} weeks at #1`;
          const rowBody = (
            <>
              <RvYearCover
                src={leader.coverUrl}
                alt=""
                title={leader.title}
                artist={leader.artist}
                className="rv-year-chart-leaders__cover"
                fallbackClassName="rv-year-chart-leaders__cover rv-year-chart-leaders__cover--empty"
                artworkSlot="year-chart-leader"
              />
              <span className="rv-year-chart-leaders__text">
                <span className="rv-year-chart-leaders__title-row">
                  <span className="rv-year-chart-leaders__title">{leader.title}</span>
                </span>
                <span className="rv-year-chart-leaders__artist">{leader.artist}</span>
                <span className="rv-year-chart-leaders__meta">{weeksLabel}</span>
              </span>
            </>
          );

          return (
            <li key={`${leader.title}|${leader.artist}|${index}`}>
              <span className="rv-year-chart-leaders__rank" aria-hidden>
                {index + 1}
              </span>
              {leader.href ? (
                <Link href={leader.href} prefetch className="rv-year-chart-leaders__link">
                  {rowBody}
                </Link>
              ) : (
                <div className="rv-year-chart-leaders__link rv-year-chart-leaders__link--static">{rowBody}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function RvYearView({ rvYear, history, destination, shellMode = "legacy" }: RvYearViewProps) {
  const router = useRouter();
  const isMobileTimeline = useMobileTimeline();
  const [expandedMonth, setExpandedMonth] = useState(1);
  const artistName = `RV ${rvYear}`;

  const openMonth = useCallback(
    (month: number) => {
      router.push(rvMonthHref(rvYear, month));
    },
    [router, rvYear],
  );

  const safeHistory = useMemo(
    () => normalizeArtistChartHistory(history, artistName),
    [history, artistName],
  );

  const monthCards = useMemo(() => {
    if (!safeHistory) return [];
    const weekly = weeklyEntriesFromHistory(safeHistory);
    return Array.from({ length: 12 }, (_, idx) => {
      const month = idx + 1;
      const groups = monthChartSnapshotGroups(weekly, rvYear, month, 3);
      const song = groups.singleSnapshots[0] ?? null;
      const album = groups.albumSnapshots[0] ?? null;
      const notable = [...groups.singleSnapshots, ...groups.albumSnapshots]
        .map((row) => ({
          id: row.id,
          title: formatRvYearTitle(row.title),
          artist: formatRvYearArtist(row.artist),
          href: rvWeekHref(rvYear, month, row.chartDate),
          chartDate: row.chartDate,
          isAlbum: isAlbumChartSnapshot(row),
        }))
        .filter((row, index, list) => {
          const dedupeKey = `${row.isAlbum ? "album" : "song"}|${row.title}|${row.artist}`.toLowerCase();
          return (
            list.findIndex((entry) => {
              const entryKey = `${entry.isAlbum ? "album" : "song"}|${entry.title}|${entry.artist}`.toLowerCase();
              return entryKey === dedupeKey;
            }) === index
          );
        })
        .filter((row) => {
          if (song && !row.isAlbum && row.title === formatRvYearTitle(song.title) && row.artist === formatRvYearArtist(song.artist)) {
            return false;
          }
          if (album && row.isAlbum && row.title === formatRvYearTitle(album.title) && row.artist === formatRvYearArtist(album.artist)) {
            return false;
          }
          return true;
        })
        .slice(0, 2);
      return {
        month,
        song: song
          ? {
              title: formatRvYearTitle(song.title),
              artist: formatRvYearArtist(song.artist),
            }
          : null,
        album: album
          ? {
              title: formatRvYearTitle(album.title),
              artist: formatRvYearArtist(album.artist),
            }
          : null,
        notable,
        hasActivity: groups.singleSnapshots.length > 0 || groups.albumSnapshots.length > 0,
      };
    });
  }, [safeHistory, rvYear]);

  const editorial = useMemo(() => rvYearEditorial(rvYear), [rvYear]);

  if (!safeHistory || !isUsableChartHistory(safeHistory)) {
    return null;
  }

  const toggleMonth = (month: number) => {
    setExpandedMonth((current) => (current === month ? 0 : month));
  };

  return (
    <div className={`rv-year-world${shellMode === "rv2" ? " rv-year-world--rv2" : ""}`}>
      <RvChronologyScrollRestore />
      <div className="rv-year-world__grain" aria-hidden />

      {shellMode === "legacy" ? <RvPublicMasthead searchQuery={String(rvYear)} /> : null}

      <section
        className="rv-year-hero"
        aria-labelledby="rv-year-heading"
        data-accent-mood={editorial.accentMood ?? undefined}
      >
        <p className="rv-year-hero__label">{editorial.theme}</p>
        <h1 id="rv-year-heading" className="rv-year-hero__year">
          {rvYear}
        </h1>
        {editorial.shortDeck ? (
          <p className="rv-year-hero__deck">{editorial.shortDeck}</p>
        ) : null}
        <h2 className="rv-year-hero__headline">{editorial.headline}</h2>
        <p className="rv-year-hero__lead">{editorial.lead}</p>

        {editorial.keywords.length ? (
          <ul className="rv-year-hero__keywords" aria-label="Year keywords">
            {editorial.keywords.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
        ) : null}

        {editorial.definingMoments.length ? (
          <ul className="rv-year-hero__moments" aria-label="Defining moments">
            {editorial.definingMoments.map((moment) => (
              <li key={moment}>{moment}</li>
            ))}
          </ul>
        ) : null}

        {destination?.heroCovers.length ? (
          <div className="rv-year-hero__covers" aria-label="Albums from this year">
            {destination.heroCovers.map((tile) =>
              tile.href ? (
                <Link
                  key={tile.coverUrl}
                  href={tile.href}
                  prefetch
                  className="rv-year-hero__cover-link"
                  aria-label="Open album"
                >
                  <RvYearCover
                    className="rv-year-hero__cover"
                    src={tile.coverUrl}
                    alt=""
                    loading="eager"
                    artworkSlot="year-hero-cover"
                  />
                </Link>
              ) : (
                <div key={tile.coverUrl} className="rv-year-hero__cover-static">
                  <RvYearCover
                    className="rv-year-hero__cover"
                    src={tile.coverUrl}
                    alt=""
                    loading="eager"
                    artworkSlot="year-hero-cover"
                  />
                </div>
              ),
            )}
          </div>
        ) : null}
      </section>

      <RvYearNavBand rvYear={rvYear} />

      {renderChartLeaders(
        "rv-top-singles",
        "Top songs",
        "Hot 100 · weeks at #1",
        destination?.topSingles ?? [],
      )}

      {renderChartLeaders(
        "rv-top-albums",
        "Top albums",
        "Album chart · weeks at #1",
        destination?.topAlbums ?? [],
      )}

      <section className="rv-year-chronicle rv-year-chronicle--primary" aria-label={`${rvYear} through the year`}>
        <header className="rv-year-chronicle__head">
          <h2 className="rv-year-chronicle__title">Through the year</h2>
          <p className="rv-year-chronicle__hint">
            {isMobileTimeline
              ? "Tap a month to peek inside, then explore the full chart."
              : "Tap a month to drill into chart weeks."}
          </p>
        </header>
        <div className={`rv-month-stack${isMobileTimeline ? " rv-month-stack--accordion" : ""}`}>
          {monthCards.map((card) => {
            const monthAnchor = `month-${monthLabel(card.month).toLowerCase()}`;
            const isOpen = !isMobileTimeline || expandedMonth === card.month;
            const monthName = monthFullName(card.month);
            return (
              <article
                key={card.month}
                id={monthAnchor}
                className={[
                  "rv-month-card",
                  isMobileTimeline ? "rv-month-card--accordion" : "rv-month-card--tappable",
                  isMobileTimeline && isOpen ? "rv-month-card--open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role={isMobileTimeline ? undefined : "link"}
                tabIndex={isMobileTimeline ? undefined : 0}
                onClick={
                  isMobileTimeline
                    ? undefined
                    : () => {
                        openMonth(card.month);
                      }
                }
                onKeyDown={
                  isMobileTimeline
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openMonth(card.month);
                        }
                      }
                }
              >
                <header
                  className="rv-month-card__head"
                  onClick={
                    isMobileTimeline
                      ? (e) => {
                          e.stopPropagation();
                          toggleMonth(card.month);
                        }
                      : undefined
                  }
                  onKeyDown={
                    isMobileTimeline
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleMonth(card.month);
                          }
                        }
                      : undefined
                  }
                  role={isMobileTimeline ? "button" : undefined}
                  tabIndex={isMobileTimeline ? 0 : undefined}
                  aria-expanded={isMobileTimeline ? isOpen : undefined}
                >
                  <div className="rv-month-card__head-row">
                    <h3 className="rv-month-card__month">{monthName.toUpperCase()}</h3>
                    {isMobileTimeline ? (
                      <span className="rv-month-card__chevron" aria-hidden>
                        {isOpen ? "▲" : "▼"}
                      </span>
                    ) : null}
                  </div>
                  {!card.hasActivity && isOpen ? (
                    <p className="rv-month-card__meta">A quieter month</p>
                  ) : null}
                </header>

                {isOpen ? (
                  <div className="rv-month-card__body">
                    <div className="rv-month-card__leaders">
                      <div className="rv-month-card__leader">
                        <p className="rv-month-card__label">Top hit</p>
                        {card.song ? (
                          <p className="rv-month-card__value">
                            {card.song.title} · {card.song.artist}
                          </p>
                        ) : (
                          <p className="rv-month-card__value rv-month-card__value--muted">—</p>
                        )}
                      </div>

                      <div className="rv-month-card__leader">
                        <p className="rv-month-card__label">Top album</p>
                        {card.album ? (
                          <p className="rv-month-card__value">
                            {card.album.title} · {card.album.artist}
                          </p>
                        ) : (
                          <p className="rv-month-card__value rv-month-card__value--muted">—</p>
                        )}
                      </div>
                    </div>

                    {card.notable.length > 0 ? (
                      <ul
                        className="rv-month-card__notable"
                        aria-label={`${monthName} highlights`}
                      >
                        {card.notable.map((item) => (
                          <li key={item.id}>
                            <Link href={item.href} prefetch onClick={(e) => e.stopPropagation()}>
                              {item.isAlbum ? "Album" : "Song"} · {item.title} · {item.artist}
                              <span className="rv-month-card__week">
                                {" "}
                                · {formatChartDateLabel(item.chartDate)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {isMobileTimeline ? (
                      <button
                        type="button"
                        className="rv-month-card__open"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMonth(card.month);
                        }}
                      >
                        Explore {monthName}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <div className="rv-year-editorial" aria-label="Editorial highlights">
        {destination?.definingArtists.length ? (
          <section className="rv-year-section rv-year-section--editorial" aria-labelledby="rv-defining-artists">
            <h2 id="rv-defining-artists" className="rv-year-section__title">
              Voices of the year
            </h2>
            <ul className="rv-year-artist-grid">
              {destination.definingArtists.map((artist) => (
                <li key={artist.slug}>
                  {artist.href ? (
                    <Link href={artist.href} prefetch className="rv-year-artist-card">
                      {artist.name}
                    </Link>
                  ) : (
                    <span className="rv-year-artist-card rv-year-artist-card--static">{artist.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {destination?.essentialAlbums.length ? (
          <section className="rv-year-section rv-year-section--editorial" aria-labelledby="rv-essential-albums">
            <h2 id="rv-essential-albums" className="rv-year-section__title">
              Albums that mattered
            </h2>
            <ul className="rv-year-album-grid">
              {destination.essentialAlbums.map((album) => (
                <li key={`${album.title}|${album.artist}`}>
                  {album.href ? (
                    <Link href={album.href} prefetch className="rv-year-album-card">
                      <span className="rv-year-album-card__art">
                        <RvYearCover
                          src={album.coverUrl}
                          alt=""
                          title={album.title}
                          artist={album.artist}
                          className="rv-year-album-card__cover"
                          fallbackClassName="rv-year-album-card__cover rv-year-album-card__cover--fallback"
                          artworkSlot="year-album-card"
                        />
                      </span>
                      <span className="rv-year-album-card__title">{album.title}</span>
                      <span className="rv-year-album-card__caption">{album.caption}</span>
                    </Link>
                  ) : (
                    <div className="rv-year-album-card rv-year-album-card--static">
                      <span className="rv-year-album-card__art">
                        <RvYearCover
                          src={album.coverUrl}
                          alt=""
                          title={album.title}
                          artist={album.artist}
                          className="rv-year-album-card__cover"
                          fallbackClassName="rv-year-album-card__cover rv-year-album-card__cover--fallback"
                          artworkSlot="year-album-card"
                        />
                      </span>
                      <span className="rv-year-album-card__title">{album.title}</span>
                      <span className="rv-year-album-card__caption">{album.caption}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {destination?.definingSongs.length ? (
          <section className="rv-year-section rv-year-section--editorial" aria-labelledby="rv-defining-songs">
            <h2 id="rv-defining-songs" className="rv-year-section__title">
              The songs
            </h2>
            <ol className="rv-year-song-list">
              {destination.definingSongs.map((song) => (
                <li key={`${song.title}|${song.artist}`}>
                  {song.href ? (
                    <Link
                      href={song.href}
                      prefetch
                      className={`rv-year-song-row${song.coverUrl ? "" : " rv-year-song-row--with-fallback"}`}
                    >
                      <RvYearCover
                        src={song.coverUrl}
                        alt=""
                        title={song.title}
                        artist={song.artist}
                        className="rv-year-song-row__thumb"
                        fallbackClassName="rv-year-song-row__thumb rv-year-song-row__thumb--fallback"
                        artworkSlot="year-song-row"
                      />
                      <span className="rv-year-song-row__text">
                        <span className="rv-year-song-row__title">{song.title}</span>
                        <span className="rv-year-song-row__artist">{song.artist}</span>
                      </span>
                    </Link>
                  ) : (
                    <div className="rv-year-song-row rv-year-song-row--static rv-year-song-row--with-fallback">
                      <RvYearCover
                        src={song.coverUrl}
                        alt=""
                        title={song.title}
                        artist={song.artist}
                        className="rv-year-song-row__thumb"
                        fallbackClassName="rv-year-song-row__thumb rv-year-song-row__thumb--fallback"
                        artworkSlot="year-song-row"
                      />
                      <span className="rv-year-song-row__text">
                        <span className="rv-year-song-row__title">{song.title}</span>
                        <span className="rv-year-song-row__artist">{song.artist}</span>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      {shellMode === "legacy" ? (
        <footer className="rv-year-footer">
          <Link href="/">← Home</Link>
          <Link href={`/rv/${rvYear}`}>Search music</Link>
        </footer>
      ) : null}
    </div>
  );
}
