"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

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
import { MAX_RV_YEAR, MIN_RV_YEAR } from "@/lib/search/normalize-rv-year";
import { rvMonthHref, rvWeekHref, rvYearHref } from "@/lib/rv/rv-chronology-paths";

import { RvChronologyScrollRestore } from "../components/rv-chronology-scroll-restore";

import "@/app/artist/[slug]/artist-charts-history.css";
import "./rv-year.css";

type RvYearViewProps = {
  rvYear: number;
  history: ArtistChartHistory;
};

function monthFullName(month: number): string {
  const d = new Date(2000, Math.max(0, Math.min(11, month - 1)), 1);
  return d.toLocaleString("en-US", { month: "long" });
}

export function RvYearView({ rvYear, history }: RvYearViewProps) {
  const router = useRouter();
  const artistName = `RV ${rvYear}`;
  const searchHref = `/search?q=${encodeURIComponent(String(rvYear))}`;

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
          title: row.title,
          artist: row.artist,
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
          if (song && !row.isAlbum && row.title === song.title && row.artist === song.artist) return false;
          if (album && row.isAlbum && row.title === album.title && row.artist === album.artist) return false;
          return true;
        })
        .slice(0, 2);
      return {
        month,
        song,
        album,
        notable,
        hasActivity: groups.singleSnapshots.length > 0 || groups.albumSnapshots.length > 0,
      };
    });
  }, [safeHistory, rvYear]);

  if (!safeHistory || !isUsableChartHistory(safeHistory)) {
    return null;
  }

  const prevYear = rvYear > MIN_RV_YEAR ? rvYear - 1 : null;
  const nextYear = rvYear < MAX_RV_YEAR ? rvYear + 1 : null;
  return (
    <div className="rv-year-world">
      <RvChronologyScrollRestore />
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
          <Link href={rvYearHref(prevYear)} prefetch className="rv-year-nav__link">
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
          <Link href={rvYearHref(nextYear)} prefetch className="rv-year-nav__link">
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
      </section>

      <section className="rv-year-chronicle" aria-label={`${rvYear} chart chronicle`}>
        <div className="rv-month-stack">
          {monthCards.map((card) => {
            const monthAnchor = `month-${monthLabel(card.month).toLowerCase()}`;
            return (
              <article
                key={card.month}
                id={monthAnchor}
                className="rv-month-card rv-month-card--tappable"
                role="link"
                tabIndex={0}
                onClick={() => openMonth(card.month)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openMonth(card.month);
                  }
                }}
              >
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
                          <Link
                            href={item.href}
                            prefetch
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.isAlbum ? "Album" : "Song"} · {item.title} · {item.artist}
                            <span className="rv-month-card__week"> · {formatChartDateLabel(item.chartDate)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="rv-year-footer">
        <Link href="/">← Home</Link>
        <Link href={searchHref}>Search entities</Link>
        {prevYear != null ? <Link href={rvYearHref(prevYear)}>← {prevYear}</Link> : null}
        {nextYear != null ? <Link href={rvYearHref(nextYear)}>{nextYear} →</Link> : null}
      </footer>
    </div>
  );
}
