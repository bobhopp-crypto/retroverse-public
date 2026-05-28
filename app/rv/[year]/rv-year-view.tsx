"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

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
import { rvYearEditorial } from "@/lib/rv-year/rv-year-editorial";
import { rvYearStats } from "@/lib/rv-year/rv-year-stats";
import { albumSuggestionHref, trackPageHref } from "@/lib/search/entity-routes";
import { MAX_RV_YEAR, MIN_RV_YEAR } from "@/lib/search/normalize-rv-year";

import "@/app/artist/[slug]/artist-charts-history.css";
import "./rv-year.css";

type RvYearViewProps = {
  rvYear: number;
  history: ArtistChartHistory;
};

function parseSelectedMonth(value: string | null): number | null {
  if (!value) return null;
  const asNum = Number(value);
  if (!Number.isInteger(asNum) || asNum < 1 || asNum > 12) return null;
  return asNum;
}

function monthFullName(month: number): string {
  const d = new Date(2000, Math.max(0, Math.min(11, month - 1)), 1);
  return d.toLocaleString("en-US", { month: "long" });
}

function monthSnapshotHref(
  snapshot:
    | {
        trackId: string;
        title: string;
        chartName: string;
      }
    | undefined,
): string | null {
  if (!snapshot) return null;
  if (isAlbumChartSnapshot(snapshot as never)) {
    return albumSuggestionHref(snapshot.title, null);
  }
  return trackPageHref(snapshot.trackId || snapshot.title);
}

export function RvYearView({ rvYear, history }: RvYearViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedMonth = parseSelectedMonth(searchParams.get("month"));
  const artistName = `RV ${rvYear}`;
  const editorial = rvYearEditorial(rvYear);
  const searchHref = `/search?q=${encodeURIComponent(String(rvYear))}`;

  const safeHistory = useMemo(
    () => normalizeArtistChartHistory(history, artistName),
    [history, artistName],
  );

  const stats = useMemo(() => {
    if (!safeHistory) return null;
    return rvYearStats(safeHistory, rvYear);
  }, [safeHistory, rvYear]);

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
          title: row.title,
          artist: row.artist,
          href: monthSnapshotHref(row),
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
          if (song && !row.isAlbum && row.title === song.title && row.artist === song.artist) return false;
          if (album && row.isAlbum && row.title === album.title && row.artist === album.artist) return false;
          return true;
        })
        .slice(0, 2);
      const weekDates = new Set(
        weekly
          .filter((entry) => entry.year === rvYear && entry.month === month)
          .map((entry) => entry.chartDate),
      );
      return {
        month,
        song,
        album,
        notable,
        hasActivity: weekDates.size > 0,
      };
    });
  }, [safeHistory, rvYear]);

  const monthDetailSnapshots = useMemo(() => {
    if (!safeHistory || selectedMonth == null) return [];
    const weekly = weeklyEntriesFromHistory(safeHistory);
    const groups = monthChartSnapshotGroups(weekly, rvYear, selectedMonth, 5);
    return [...groups.singleSnapshots, ...groups.albumSnapshots]
      .sort((a, b) => a.chartDate.localeCompare(b.chartDate))
      .slice(0, 5);
  }, [safeHistory, rvYear, selectedMonth]);

  if (!safeHistory || !isUsableChartHistory(safeHistory)) {
    return null;
  }

  const prevYear = rvYear > MIN_RV_YEAR ? rvYear - 1 : null;
  const nextYear = rvYear < MAX_RV_YEAR ? rvYear + 1 : null;
  return (
    <div className="rv-year-world">
      <div className="rv-year-world__grain" aria-hidden />

      <header className="rv-year-topbar">
        <div className="rv-year-topbar__brand">
          <Link href="/" className="rv-year-logo" prefetch>
            Retroverse
          </Link>
          <span className="rv-year-file-tag">RV Year · {rvYear}</span>
        </div>
        <div className="rv-year-topbar__actions">
          <Link href={searchHref} className="rv-year-topbar__action" prefetch>
            Search the archive
          </Link>
        </div>
      </header>

      <nav className="rv-year-nav" aria-label="Year navigation">
        {prevYear != null ? (
          <Link href={`/rv/${prevYear}`} prefetch className="rv-year-nav__link">
            ← {prevYear}
          </Link>
        ) : (
          <span className="rv-year-nav__link rv-year-nav__link--disabled" aria-hidden>
            ←
          </span>
        )}
        <Link href={searchHref} prefetch className="rv-year-nav__link rv-year-nav__link--explore">
          Search
        </Link>
        {nextYear != null ? (
          <Link href={`/rv/${nextYear}`} prefetch className="rv-year-nav__link">
            {nextYear} →
          </Link>
        ) : (
          <span className="rv-year-nav__link rv-year-nav__link--disabled" aria-hidden>
            →
          </span>
        )}
      </nav>

      <section className="rv-year-hero" aria-labelledby="rv-year-heading">
        <p className="rv-year-hero__eyebrow">Now entering</p>
        <h1 id="rv-year-heading" className="rv-year-hero__year">
          {rvYear}
        </h1>
        <p className="rv-year-hero__tagline">{editorial.tagline}</p>
        <p className="rv-year-hero__lead">{editorial.lead}</p>
        {stats ? (
          <ul className="rv-year-hero__stats" aria-label="Chart year facts">
            <li className="rv-year-hero__stat">{stats.activeMonths} active months</li>
            <li className="rv-year-hero__stat">Hot 100 + Album 200</li>
            <li className="rv-year-hero__stat">{stats.chartWeeks.toLocaleString()} chart weeks</li>
          </ul>
        ) : null}
      </section>

      <section className="rv-year-chronicle" aria-label={`${rvYear} chart chronicle`}>
        {selectedMonth == null ? (
          <div className="rv-month-stack">
            {monthCards.map((card) => {
              const monthAnchor = `month-${monthLabel(card.month).toLowerCase()}`;
              const openMonthHref = `${pathname}?month=${card.month}`;
              return (
                <Link key={card.month} href={openMonthHref} prefetch className="rv-month-card-link">
                  <article id={monthAnchor} className="rv-month-card">
                    <header className="rv-month-card__head">
                      <h3 className="rv-month-card__month">{monthFullName(card.month).toUpperCase()}</h3>
                      {!card.hasActivity ? <p className="rv-month-card__meta">No chart weeks captured</p> : null}
                    </header>

                    <div className="rv-month-card__leaders">
                      <div className="rv-month-card__leader">
                        <p className="rv-month-card__label">#1 Song</p>
                        {card.song ? (
                          <p className="rv-month-card__value">
                            {card.song.title} · {card.song.artist}
                          </p>
                        ) : (
                          <p className="rv-month-card__value rv-month-card__value--muted">No Hot 100 #1 captured</p>
                        )}
                      </div>

                      <div className="rv-month-card__leader">
                        <p className="rv-month-card__label">#1 Album</p>
                        {card.album ? (
                          <p className="rv-month-card__value">
                            {card.album.title} · {card.album.artist}
                          </p>
                        ) : (
                          <p className="rv-month-card__value rv-month-card__value--muted">No Album 200 #1 captured</p>
                        )}
                      </div>
                    </div>

                    {card.notable.length > 0 ? (
                      <ul className="rv-month-card__notable" aria-label={`${monthFullName(card.month)} notable chart entries`}>
                        {card.notable.map((item) => (
                          <li key={item.id}>
                            <span>
                              {item.isAlbum ? "Album" : "Song"} · {item.title} · {item.artist}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rv-month-detail">
            <div className="rv-month-detail__head">
              <h2 className="rv-month-detail__title">
                {monthFullName(selectedMonth).toUpperCase()} {rvYear}
              </h2>
              <Link href={pathname} prefetch className="rv-month-detail__back">
                Back to months
              </Link>
            </div>

            {monthDetailSnapshots.length > 0 ? (
              <ul className="rv-month-detail__cards" aria-label={`${monthFullName(selectedMonth)} chart cards`}>
                {monthDetailSnapshots.map((snapshot) => {
                  const href = monthSnapshotHref(snapshot);
                  return (
                    <li key={snapshot.id} className="rv-month-detail-card">
                      <div className="rv-month-detail-card__meta">
                        <span>{snapshot.chartDisplayName}</span>
                        <span>{formatChartDateLabel(snapshot.chartDate)}</span>
                      </div>
                      {href ? (
                        <Link href={href} prefetch className="rv-month-detail-card__title">
                          {snapshot.title}
                        </Link>
                      ) : (
                        <p className="rv-month-detail-card__title">{snapshot.title}</p>
                      )}
                      <p className="rv-month-detail-card__artist">{snapshot.artist}</p>
                      <p className="rv-month-detail-card__rank">#1 peak</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rv-month-detail__empty">No chart cards available for this month.</p>
            )}
          </div>
        )}
      </section>

      <footer className="rv-year-footer">
        <Link href="/">← Home</Link>
        <Link href={searchHref}>Search entities</Link>
        {prevYear != null ? <Link href={`/rv/${prevYear}`}>← {prevYear}</Link> : null}
        {nextYear != null ? <Link href={`/rv/${nextYear}`}>{nextYear} →</Link> : null}
      </footer>
    </div>
  );
}
