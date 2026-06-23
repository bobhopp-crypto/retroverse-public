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
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";
import { rvMonthHref, rvWeekHref } from "@/lib/rv/rv-chronology-paths";

import { RvChronologyScrollRestore } from "../components/rv-chronology-scroll-restore";
import { RvPublicMasthead } from "../components/rv-public-masthead";
import { RvYearNavBand } from "../components/rv-year-nav-band";
import "@/app/artist/[slug]/artist-charts-history.css";
import "@/app/public-mobile-width.css";
import "./rv-year.css";

type RvYearViewProps = {
  rvYear: number;
  history: ArtistChartHistory;
  destination: RvYearDestination;
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

export function RvYearView({ rvYear, history, destination }: RvYearViewProps) {
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
    <div className="rv-year-world">
      <RvChronologyScrollRestore />
      <div className="rv-year-world__grain" aria-hidden />

      <RvPublicMasthead searchQuery={String(rvYear)} />

      <section className="rv-year-hero" aria-labelledby="rv-year-heading">
        <p className="rv-year-hero__label">Year</p>
        <h1 id="rv-year-heading" className="rv-year-hero__year">
          {rvYear}
        </h1>
        <h2 className="rv-year-hero__headline">{editorial.headline}</h2>
        <p className="rv-year-hero__lead">{editorial.lead}</p>

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
                  <img
                    className="rv-year-hero__cover"
                    src={tile.coverUrl}
                    alt=""
                    loading="eager"
                    decoding="async"
                  />
                </Link>
              ) : (
                <div key={tile.coverUrl} className="rv-year-hero__cover-static">
                  <img
                    className="rv-year-hero__cover"
                    src={tile.coverUrl}
                    alt=""
                    loading="eager"
                    decoding="async"
                  />
                </div>
              ),
            )}
          </div>
        ) : null}
      </section>

      <RvYearNavBand rvYear={rvYear} />

      {destination?.definingArtists.length ? (
        <section className="rv-year-section" aria-labelledby="rv-defining-artists">
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
        <section className="rv-year-section" aria-labelledby="rv-essential-albums">
          <h2 id="rv-essential-albums" className="rv-year-section__title">
            Albums that mattered
          </h2>
          <ul className="rv-year-album-grid">
            {destination.essentialAlbums.map((album) => (
              <li key={`${album.title}|${album.artist}`}>
                {album.href ? (
                  <Link href={album.href} prefetch className="rv-year-album-card">
                    <span className="rv-year-album-card__art">
                      <img src={album.coverUrl} alt="" loading="lazy" />
                    </span>
                    <span className="rv-year-album-card__title">{album.title}</span>
                    <span className="rv-year-album-card__caption">{album.caption}</span>
                  </Link>
                ) : (
                  <div className="rv-year-album-card rv-year-album-card--static">
                    <span className="rv-year-album-card__art">
                      <img src={album.coverUrl} alt="" loading="lazy" />
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
        <section className="rv-year-section" aria-labelledby="rv-defining-songs">
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
                    className={`rv-year-song-row${song.coverUrl ? "" : " rv-year-song-row--text-only"}`}
                  >
                    {song.coverUrl ? (
                      <img className="rv-year-song-row__thumb" src={song.coverUrl} alt="" loading="lazy" />
                    ) : null}
                    <span className="rv-year-song-row__text">
                      <span className="rv-year-song-row__title">{song.title}</span>
                      <span className="rv-year-song-row__artist">{song.artist}</span>
                    </span>
                  </Link>
                ) : (
                  <div
                    className={`rv-year-song-row rv-year-song-row--static${song.coverUrl ? "" : " rv-year-song-row--text-only"}`}
                  >
                    {song.coverUrl ? (
                      <img className="rv-year-song-row__thumb" src={song.coverUrl} alt="" loading="lazy" />
                    ) : null}
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

      <section className="rv-year-chronicle" aria-label={`${rvYear} through the year`}>
        <header className="rv-year-chronicle__head">
          <h2 className="rv-year-chronicle__title">Through the year</h2>
          <p className="rv-year-chronicle__hint">
            {isMobileTimeline
              ? "Tap a month to peek inside, then explore the full story."
              : "Tap a month to explore what people were playing."}
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

      <footer className="rv-year-footer">
        <Link href="/">← Home</Link>
        <Link href={`/rv/${rvYear}`}>Search music</Link>
      </footer>
    </div>
  );
}
