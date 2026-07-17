"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import {
  isUsableChartHistory,
  normalizeArtistChartHistory,
} from "@/lib/artist/chart-history";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";
import {
  monthChartSnapshotGroups,
  monthLabel,
  weeklyEntriesFromHistory,
} from "@/lib/artist/chart-history-display";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import { rvYearEditorial } from "@/lib/rv-year/rv-year-editorial";
import { isUsableCoverUrl } from "@/lib/rv-year/hero-cover-fill";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";

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

export function RvYearView({ rvYear, history, destination, shellMode = "legacy" }: RvYearViewProps) {
  const isMobileTimeline = useMobileTimeline();
  const [expandedMonth, setExpandedMonth] = useState(1);
  const [unavailableArtwork, setUnavailableArtwork] = useState<Set<string>>(() => new Set());
  const artistName = `RV ${rvYear}`;

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
      const weekDates = Array.from(
        new Set(
          weekly
            .filter((entry) => entry.year === rvYear && entry.month === month && entry.chartDate)
            .map((entry) => entry.chartDate.slice(0, 10)),
        ),
      ).sort();
      return {
        month,
        weekDates,
        hasActivity: weekDates.length > 0 || groups.singleSnapshots.length > 0 || groups.albumSnapshots.length > 0,
      };
    });
  }, [safeHistory, rvYear]);

  const editorial = useMemo(() => rvYearEditorial(rvYear), [rvYear]);
  const heroCoverUrls = useMemo(() => new Set(destination.heroCovers.map((cover) => cover.coverUrl)), [destination.heroCovers]);
  const songCoverUrls = useMemo(
    () => new Set(destination.definingSongs
      .filter((song) => isUsableCoverUrl(song.coverUrl) && song.href && !heroCoverUrls.has(song.coverUrl!))
      .slice(0, 4)
      .map((song) => song.coverUrl!)),
    [destination.definingSongs, heroCoverUrls],
  );
  const yearFacts = useMemo(
    () => [
      ["Chart weeks", new Set(weeklyEntriesFromHistory(safeHistory!).filter((row) => row.year === rvYear).map((row) => row.chartDate)).size],
      ["Featured songs", destination.topSingles.length],
      ["Featured albums", destination.topAlbums.length],
      ["Artists represented", new Set(destination.topSingles.map((row) => row.artist.toLowerCase())).size],
    ].filter(([, value]) => Number(value) > 0),
    [destination.topAlbums.length, destination.topSingles, rvYear, safeHistory],
  );
  const hideArtwork = useCallback((key: string) => {
    setUnavailableArtwork((current) => new Set(current).add(key));
  }, []);

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
        <RetroverseBack
          fallbackHref="/search"
          fallbackLabel="Search"
          className="rv-year-hero__back"
        />
        <p className="rv-year-hero__label">Retroverse Year</p>
        <h1 id="rv-year-heading" className="rv-year-hero__year">
          {rvYear}
        </h1>
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

      {yearFacts.length ? <section className="rv-year-facts" aria-labelledby="rv-year-facts-title">
        <h2 id="rv-year-facts-title" className="sr-only">Year facts</h2>
        <div className="rv-year-facts__grid">
          {yearFacts.map(([label, value]) => (
            <div className="rv-year-fact" key={String(label)}><strong>{value}</strong><span>{label}</span></div>
          ))}
        </div>
      </section> : null}

      {destination.definingSongs.filter((song) => isUsableCoverUrl(song.coverUrl) && song.href && !heroCoverUrls.has(song.coverUrl!)).slice(0, 4).length >= 4 ? (
        <section id="songs" className="rv-year-section rv-year-section--songs" aria-labelledby="rv-defining-songs">
          <p className="rv-year-section__kicker">Songs</p>
          <h2 id="rv-defining-songs" className="rv-year-section__title">Songs that shaped the chart</h2>
          <div className="rv-year-art-shelf rv-year-art-shelf--songs">
            {destination.definingSongs.filter((song) => isUsableCoverUrl(song.coverUrl) && song.href && !heroCoverUrls.has(song.coverUrl!) && !unavailableArtwork.has(`song|${song.title}|${song.artist}`)).slice(0, 4).map((song) => (
              <Link key={`${song.title}|${song.artist}`} href={song.href!} className="rv-year-art-card">
                <RvYearCover src={song.coverUrl} alt="" title={song.title} artist={song.artist} className="rv-year-art-card__cover" artworkSlot="year-defining-song" onArtworkError={() => hideArtwork(`song|${song.title}|${song.artist}`)} />
                <span className="rv-year-art-card__title">{song.title}</span><span className="rv-year-art-card__caption">{song.artist}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {destination.essentialAlbums.filter((album) => isUsableCoverUrl(album.coverUrl) && album.href && !heroCoverUrls.has(album.coverUrl) && !songCoverUrls.has(album.coverUrl!)).slice(0, 4).length >= 4 ? (
        <section id="albums" className="rv-year-section rv-year-section--albums" aria-labelledby="rv-year-albums">
          <p className="rv-year-section__kicker">Albums</p><h2 id="rv-year-albums" className="rv-year-section__title">Albums that defined the year</h2>
          <div className="rv-year-art-shelf rv-year-art-shelf--albums">
            {destination.essentialAlbums.filter((album) => isUsableCoverUrl(album.coverUrl) && album.href && !heroCoverUrls.has(album.coverUrl) && !songCoverUrls.has(album.coverUrl!) && !unavailableArtwork.has(`album|${album.title}|${album.artist}`)).slice(0, 4).map((album) => (
              <Link key={`${album.title}|${album.artist}`} href={album.href!} className="rv-year-art-card">
                <RvYearCover src={album.coverUrl} alt="" title={album.title} artist={album.artist} className="rv-year-art-card__cover" artworkSlot="year-album" onArtworkError={() => hideArtwork(`album|${album.title}|${album.artist}`)} />
                <span className="rv-year-art-card__title">{album.title}</span><span className="rv-year-art-card__caption">{album.artist}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* TODO(V4): Add Related Years when the existing similarity source is exposed to this route. */}
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
                  isMobileTimeline ? "rv-month-card--accordion" : "",
                  isMobileTimeline && isOpen ? "rv-month-card--open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
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
                    <div className="rv-month-card__weeks" aria-label={`${monthName} chart weeks`}>
                      {card.weekDates.map((date) => (
                        <Link key={date} className="rv-month-card__week-pill" href={chartWeekPortalHref(date)}>
                          {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {shellMode === "legacy" ? (
        <footer className="rv-year-footer">
          <Link href="/">← Home</Link>
          <Link href={`/rv/${rvYear}`}>Search music</Link>
        </footer>
      ) : null}
    </div>
  );
}
