"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  activeDecades,
  decadeLabel,
  formatChartDateLabel,
  formatMonthYearHeading,
  monthLabel,
  monthsWithChartData,
  monthChartSnapshotGroups,
  isAlbumChartSnapshot,
  RV_CALENDAR_MONTHS,
  weeklyEntriesFromHistory,
  yearsInDecade,
} from "@/lib/artist/chart-history-display";
import {
  isUsableChartHistory,
  normalizeArtistChartHistory,
} from "@/lib/artist/chart-history";
import {
  readChartHistorySession,
  writeChartHistorySession,
} from "@/lib/artist/chart-history-session";
import {
  chartHistoryQueryString,
  chartHistoryUrlStatesEqual,
  parseChartHistorySearchParams,
  type ChartHistoryUrlState,
} from "@/lib/artist/chart-history-url";
import { slugFromArtistName } from "@/lib/artist/slug";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";
import { albumSuggestionHref, trackPageHref } from "@/lib/search/entity-routes";
import {
  matchRvChronologyPath,
  parseRvWeekParam,
  rvChronologyPathFromState,
  rvWeekHref,
} from "@/lib/rv/rv-chronology-paths";
import { songActionTargetFromParts } from "@/lib/songs/song-actions";
import type {
  ArtistChartHistory,
  RvChartSnapshot,
} from "@/lib/artist/chart-history-types";

import { SongActions } from "@/app/components/song-actions";
import { ArtistCover } from "./artist-cover";

type Props = {
  artistName: string;
  history: ArtistChartHistory;
  highlightTrackIds?: string[];
  viewAllHref?: string;
  hideBanner?: boolean;
  /** Search RV History: preload this RV year when present in chart data. */
  initialRvYear?: number | null;
  /** Optional preload month for views linking directly into a year month. */
  initialMonth?: number | null;
  /** Highlight a specific chart week card (YYYY-MM-DD) on RV chronology drill. */
  highlightChartDate?: string | null;
  /** Charts explore — year chosen upstream; skip duplicate year step. */
  hideYearStep?: boolean;
};

function asPillNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function isHighlighted(trackId: string | undefined, highlightIds: Set<string>): boolean {
  if (!trackId?.trim()) return false;
  if (highlightIds.has(trackId.toUpperCase())) return true;
  if (highlightIds.has(trackId)) return true;
  return false;
}

function snapshotEntityHref(snapshot: RvChartSnapshot): string | null {
  if (isAlbumChartSnapshot(snapshot)) {
    if (/^RVAL\d{6}$/i.test(snapshot.trackId)) {
      return `/album/${snapshot.trackId.toUpperCase()}`;
    }
    return albumSuggestionHref(snapshot.title, null);
  }
  if (!snapshot.chartName.includes("Hot 100")) return null;
  if (/^RVTR\d{6}$/i.test(snapshot.trackId)) return trackPageHref(snapshot.trackId);
  if (snapshot.title?.trim()) return trackPageHref(snapshot.title);
  return null;
}

export function ArtistChartsHistoryClient({
  artistName,
  history: historyProp,
  highlightTrackIds,
  viewAllHref,
  hideBanner = false,
  initialRvYear = null,
  initialMonth = null,
  highlightChartDate = null,
  hideYearStep = false,
}: Props) {
  const safeHistory = useMemo(
    () => normalizeArtistChartHistory(historyProp, artistName),
    [historyProp, artistName],
  );

  const entries = Array.isArray(safeHistory?.entries) ? safeHistory.entries : [];
  const weeklyEntries = useMemo(
    () => (safeHistory ? weeklyEntriesFromHistory(safeHistory) : []),
    [safeHistory],
  );
  const activeYears = Array.isArray(safeHistory?.activeYears) ? safeHistory.activeYears : [];

  const safeHighlightIds = Array.isArray(highlightTrackIds) ? highlightTrackIds : [];

  const useDecades = activeYears.length > 10;
  const decades = useMemo(() => activeDecades(activeYears), [activeYears]);
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const syncChartUrl = /\/artist\/[^/]+\/charts\/?$/.test(pathname);
  const rvChronologyPath = useMemo(() => matchRvChronologyPath(pathname), [pathname]);
  const syncRvChronologyUrl = rvChronologyPath != null;
  const hydratedRef = useRef(false);
  const applyingUrlRef = useRef(false);

  const artistStorageKey = useMemo(
    () => slugFromArtistName(artistName),
    [artistName],
  );

  const urlState = useMemo(
    () =>
      syncChartUrl
        ? parseChartHistorySearchParams(searchParams, activeYears, { useDecades })
        : null,
    [syncChartUrl, searchParams, activeYears, useDecades],
  );

  const applyChartState = (state: ChartHistoryUrlState) => {
    setSelectedDecade(state.decade);
    setSelectedYear(state.year);
    setSelectedMonth(state.month);
  };

  const currentChartState = useMemo(
    (): ChartHistoryUrlState => ({
      decade: selectedDecade,
      year: selectedYear,
      month: selectedMonth,
    }),
    [selectedDecade, selectedYear, selectedMonth],
  );

  const rvContextWeek = useMemo(
    () =>
      selectedWeek ??
      rvChronologyPath?.week ??
      (highlightChartDate ? highlightChartDate.slice(0, 10) : null),
    [selectedWeek, rvChronologyPath?.week, highlightChartDate],
  );

  const chartsContextHref = useMemo(() => {
    if (syncRvChronologyUrl) {
      return (
        rvChronologyPathFromState(
          asPillNumber(selectedYear),
          asPillNumber(selectedMonth),
          rvContextWeek,
        ) ?? viewAllHref ?? null
      );
    }
    if (!syncChartUrl) return viewAllHref ?? null;
    const qs = chartHistoryQueryString(currentChartState, { useDecades });
    return qs ? `${pathname}?${qs}` : pathname;
  }, [
    syncRvChronologyUrl,
    syncChartUrl,
    pathname,
    currentChartState,
    useDecades,
    viewAllHref,
    selectedYear,
    selectedMonth,
    rvContextWeek,
  ]);

  useEffect(() => {
    if (hydratedRef.current) return;

    if (syncChartUrl && urlState) {
      applyChartState(urlState);
      hydratedRef.current = true;
      return;
    }

    const stored = readChartHistorySession(artistStorageKey);
    if (stored?.year != null && activeYears.includes(stored.year)) {
      applyChartState({
        decade: useDecades
          ? stored.decade != null
            ? stored.decade
            : Math.floor(stored.year / 10) * 10
          : null,
        year: stored.year,
        month:
          stored.month != null && stored.month >= 1 && stored.month <= 12
            ? stored.month
            : null,
      });
      hydratedRef.current = true;
      return;
    }

    const resolvedInitial = normalizeRVYear(initialRvYear);
    const preload =
      resolvedInitial != null && activeYears.includes(resolvedInitial)
        ? resolvedInitial
        : null;

    if (preload == null) {
      applyChartState({ decade: null, year: null, month: null });
      hydratedRef.current = true;
      return;
    }

    const month =
      initialMonth != null && initialMonth >= 1 && initialMonth <= 12
        ? initialMonth
        : null;
    applyChartState({
      decade: useDecades ? Math.floor(preload / 10) * 10 : null,
      year: preload,
      month,
    });
    if (syncRvChronologyUrl) {
      const weekFromPath = rvChronologyPath?.week ?? null;
      const weekFromHighlight = highlightChartDate
        ? parseRvWeekParam(highlightChartDate)
        : null;
      setSelectedWeek(weekFromPath ?? weekFromHighlight);
    }
    hydratedRef.current = true;
  }, [
    artistStorageKey,
    entries.length,
    initialRvYear,
    initialMonth,
    useDecades,
    activeYears,
    syncChartUrl,
    syncRvChronologyUrl,
    rvChronologyPath?.week,
    highlightChartDate,
    urlState,
  ]);

  /** Browser back/forward: pathname is source of truth (not in-flight week taps). */
  useEffect(() => {
    if (!syncRvChronologyUrl || !hydratedRef.current || applyingUrlRef.current) return;
    const path = rvChronologyPath;
    if (!path) return;
    const pathYear = path.year;
    const pathMonth = path.month;
    const pathWeek = path.week ?? null;
    if (pathYear !== asPillNumber(selectedYear)) setSelectedYear(pathYear);
    if (pathMonth != null && pathMonth !== asPillNumber(selectedMonth)) {
      setSelectedMonth(pathMonth);
    }
    if (pathWeek !== selectedWeek) setSelectedWeek(pathWeek);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when URL changes
  }, [pathname, syncRvChronologyUrl, rvChronologyPath]);

  useEffect(() => {
    if (!syncChartUrl || !hydratedRef.current || applyingUrlRef.current) return;

    if (urlState) {
      if (chartHistoryUrlStatesEqual(urlState, currentChartState)) return;
      applyChartState(urlState);
      return;
    }

    const hasUrlParams =
      searchParams.get("year") ||
      searchParams.get("month") ||
      searchParams.get("decade");
    if (hasUrlParams) return;

    if (
      currentChartState.year != null ||
      currentChartState.month != null ||
      currentChartState.decade != null
    ) {
      applyChartState({ decade: null, year: null, month: null });
    }
  }, [syncChartUrl, urlState, currentChartState, searchParams]);

  useEffect(() => {
    if (!syncChartUrl || !hydratedRef.current) return;
    const qs = chartHistoryQueryString(currentChartState, { useDecades });
    const currentQs = searchParams.toString();
    if (qs === currentQs) return;
    applyingUrlRef.current = true;
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { scroll: false });
    queueMicrotask(() => {
      applyingUrlRef.current = false;
    });
  }, [
    syncChartUrl,
    currentChartState,
    useDecades,
    pathname,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!syncRvChronologyUrl || !hydratedRef.current || applyingUrlRef.current) return;
    const path = rvChronologyPath;
    const year = asPillNumber(currentChartState.year);
    const month = asPillNumber(currentChartState.month);
    if (year == null) return;

    const monthChanged =
      path?.month != null && month != null && path.month !== month;
    const yearChanged = path != null && path.year !== year;
    const weekCleared = selectedWeek == null && path?.week != null;
    if (!monthChanged && !yearChanged && !weekCleared) return;

    const next = rvChronologyPathFromState(year, month, null);
    if (!next || next === pathname) return;
    applyingUrlRef.current = true;
    router.replace(next, { scroll: false });
    queueMicrotask(() => {
      applyingUrlRef.current = false;
    });
  }, [
    syncRvChronologyUrl,
    currentChartState,
    selectedWeek,
    rvChronologyPath,
    pathname,
    router,
  ]);

  useEffect(() => {
    writeChartHistorySession(artistStorageKey, currentChartState);
  }, [artistStorageKey, currentChartState]);

  const highlightIds = useMemo(() => {
    const ids = safeHighlightIds
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim().toUpperCase());
    return new Set(ids);
  }, [safeHighlightIds]);

  const visibleYears = useMemo(() => {
    if (!useDecades) return activeYears;
    const decade = asPillNumber(selectedDecade);
    if (decade == null) return [];
    return yearsInDecade(activeYears, decade);
  }, [activeYears, selectedDecade, useDecades]);

  const yearForData = asPillNumber(selectedYear);

  const monthsWithData = useMemo(() => {
    if (yearForData == null) return new Set<number>();
    return monthsWithChartData(weeklyEntries, yearForData);
  }, [weeklyEntries, yearForData]);

  const { singleSnapshots, albumSnapshots } = useMemo(() => {
    const year = asPillNumber(selectedYear);
    const month = asPillNumber(selectedMonth);
    if (year == null || month == null) {
      return { singleSnapshots: [], albumSnapshots: [] };
    }
    return monthChartSnapshotGroups(weeklyEntries, year, month, 5);
  }, [weeklyEntries, selectedYear, selectedMonth]);

  const hasSnapshots = singleSnapshots.length > 0 || albumSnapshots.length > 0;

  const activeRvWeekKey =
    selectedWeek ??
    rvChronologyPath?.week ??
    (highlightChartDate ? highlightChartDate.slice(0, 10) : null);

  const pickWeek = (chartDate: string | undefined) => {
    if (!syncRvChronologyUrl) return;
    const key = chartDate?.trim().slice(0, 10) ?? "";
    if (!parseRvWeekParam(key)) return;
    const year = asPillNumber(selectedYear);
    const month = asPillNumber(selectedMonth);
    if (year == null || month == null) return;
    const href = rvWeekHref(year, month, key);
    if (href === pathname) {
      setSelectedWeek(key);
      return;
    }
    setSelectedWeek(key);
    applyingUrlRef.current = true;
    router.push(href, { scroll: false });
    queueMicrotask(() => {
      applyingUrlRef.current = false;
    });
  };

  const renderSnapshotCard = (snapshot: RvChartSnapshot) => {
    if (!snapshot?.id) return null;
    const weekKey = snapshot.chartDate?.trim().slice(0, 10) ?? "";
    const active =
      isHighlighted(snapshot.trackId, highlightIds) ||
      (activeRvWeekKey != null && weekKey === activeRvWeekKey);
    const isAlbum = isAlbumChartSnapshot(snapshot);
    const peak =
      typeof snapshot.peakPosition === "number" && snapshot.peakPosition > 0
        ? snapshot.peakPosition
        : "—";
    const entityHref = snapshotEntityHref(snapshot);
    const year = asPillNumber(selectedYear);
    const month = asPillNumber(selectedMonth);
    const rvWeekNavHref =
      syncRvChronologyUrl && year != null && month != null && parseRvWeekParam(weekKey)
        ? rvWeekHref(year, month, weekKey)
        : null;

    const titleNode =
      entityHref && syncRvChronologyUrl ? (
        <Link
          href={entityHref}
          prefetch
          className="charts-history-card__title-link"
          onClick={(event) => event.stopPropagation()}
        >
          {snapshot.title || "—"}
        </Link>
      ) : (
        snapshot.title || "—"
      );

    const cardBody = (
      <>
        <div className="charts-history-card__cover">
          <ArtistCover
            src={snapshot.coverUrl}
            alt=""
            className="charts-history-card__cover-img"
            fallbackClassName="charts-history-card__cover-fallback"
            fallbackVariant={isAlbum ? "plate" : "vinyl"}
            plateDensity="compact"
            placeholderContext={
              isAlbum
                ? {
                    artist: snapshot.artist || artistName,
                    album: snapshot.title,
                    releaseYear: snapshot.releaseYear ?? null,
                    rval: /^RVAL\d{6}$/i.test(snapshot.trackId)
                      ? snapshot.trackId.toUpperCase()
                      : undefined,
                  }
                : {
                    artist: snapshot.artist || artistName,
                    album: snapshot.title,
                    releaseYear: snapshot.releaseYear ?? null,
                  }
            }
          />
        </div>
        <div className="charts-history-card__body">
          <h4 className="charts-history-card__title">{titleNode}</h4>
          <p className="charts-history-card__artist">{snapshot.artist || artistName}</p>
          <p className="charts-history-card__facts">
            <span>{formatChartDateLabel(snapshot.chartDate ?? "")}</span>
          </p>
        </div>
        <div className="charts-history-card__stamp">
          <span className="charts-history-card__stamp-peak">#{peak}</span>
          <span className="charts-history-card__stamp-date">
            {formatChartDateLabel(snapshot.chartDate ?? "")}
          </span>
        </div>
      </>
    );

    return (
      <li
        key={snapshot.id}
        className={`charts-history-card${active ? " charts-history-card--active" : ""}`}
      >
        {rvWeekNavHref ? (
          <button
            type="button"
            className="charts-history-card__link"
            aria-label={`Chart week ${formatChartDateLabel(weekKey)}`}
            aria-current={active ? "true" : undefined}
            onClick={() => pickWeek(snapshot.chartDate)}
          >
            {cardBody}
          </button>
        ) : entityHref ? (
          <Link
            href={entityHref}
            prefetch
            className="charts-history-card__link"
            aria-label={`Open ${snapshot.title}`}
          >
            {cardBody}
          </Link>
        ) : (
          cardBody
        )}
        {!isAlbum ? (
          <SongActions
            layout="inline"
            className="charts-history-card__song-actions"
            target={songActionTargetFromParts({
              title: snapshot.title,
              artist: snapshot.artist || artistName,
              rvtr: snapshot.trackId,
              href: entityHref,
              artistSlug: artistStorageKey,
              chartYear: snapshot.year,
              chartDate: snapshot.chartDate,
              chartsHref: chartsContextHref,
            })}
          />
        ) : null}
      </li>
    );
  };

  const pickYear = (year: unknown) => {
    const y = asPillNumber(year);
    if (y == null) return;
    setSelectedYear(y);
    setSelectedMonth(null);
    setSelectedWeek(null);
  };

  const pickDecade = (decadeStart: unknown) => {
    const d = asPillNumber(decadeStart);
    if (d == null) return;
    setSelectedDecade(d);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedWeek(null);
  };

  const pickMonth = (month: unknown) => {
    const m = asPillNumber(month);
    if (m == null || m < 1 || m > 12) return;
    setSelectedMonth(m);
    setSelectedWeek(null);
  };

  const clearFilters = () => {
    setSelectedDecade(null);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedWeek(null);
  };

  if (!isUsableChartHistory(safeHistory)) {
    return (
      <section className="charts-history charts-history--empty" role="status">
        <p className="charts-history__empty charts-history__empty--archival">
          No chart history filed for this artist in the archive yet.
        </p>
      </section>
    );
  }

  const decadeForLabel = asPillNumber(selectedDecade);
  const yearForLabel = asPillNumber(selectedYear);
  const monthForLabel = asPillNumber(selectedMonth);

  const step2Label = useDecades
    ? decadeForLabel != null
      ? `SELECT MONTH (${decadeLabel(decadeForLabel)})`
      : "SELECT MONTH"
    : yearForLabel != null
      ? `SELECT MONTH (${yearForLabel})`
      : "SELECT MONTH";

  const step3Label =
    yearForLabel != null && monthForLabel != null
      ? formatMonthYearHeading(yearForLabel, monthForLabel)
      : "CHART RESULTS";

  const monthStepNum = hideYearStep ? 1 : 2;
  const snapshotStepNum = hideYearStep ? 2 : 3;

  return (
    <section
      className="charts-history"
      aria-label={hideBanner ? `Chart history for ${artistName}` : undefined}
      aria-labelledby={hideBanner ? undefined : "charts-history-heading"}
    >
      {hideBanner ? null : (
        <header className="charts-history__banner">
          <div className="charts-history__banner-icon" aria-hidden>
            ★
          </div>
          <div className="charts-history__banner-text">
            <h2 id="charts-history-heading" className="charts-history__title">
              Charts History
            </h2>
            <p className="charts-history__subtitle">
              Chart history · {artistName}
            </p>
          </div>
          {viewAllHref ? (
            <a className="charts-history__tutorial" href={viewAllHref}>
              View all
            </a>
          ) : null}
        </header>
      )}

      {hideYearStep ? null : (
        <>
          <div className="charts-history__step">
            <div className="charts-history__step-head">
              <span className="charts-history__step-num">1</span>
              <h3 className="charts-history__step-title">Select year</h3>
            </div>
        <div className="charts-history__pills">
          {useDecades
            ? Array.isArray(decades)
              ? decades.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`charts-history__pill${decadeForLabel === d ? " charts-history__pill--filter" : ""}`}
                    aria-pressed={decadeForLabel === d}
                    onClick={() => pickDecade(d)}
                  >
                    {decadeLabel(d)}
                  </button>
                ))
              : null
            : Array.isArray(activeYears)
              ? activeYears.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={`charts-history__pill${yearForLabel === y ? " charts-history__pill--filter" : ""}`}
                    aria-pressed={yearForLabel === y}
                    onClick={() => pickYear(y)}
                  >
                    {y}
                  </button>
                ))
              : null}
        </div>
        {useDecades && decadeForLabel != null && Array.isArray(visibleYears) && visibleYears.length > 0 ? (
          <div className="charts-history__pills charts-history__pills--years">
            {visibleYears.map((y) => (
              <button
                key={y}
                type="button"
                className={`charts-history__pill charts-history__pill--year${yearForLabel === y ? " charts-history__pill--filter" : ""}`}
                aria-pressed={yearForLabel === y}
                onClick={() => pickYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        ) : null}
      </div>

          <div className="charts-history__divider" aria-hidden>
            ↓
          </div>
        </>
      )}

      {yearForLabel != null ? (
        <>
          <div className="charts-history__step">
            <div className="charts-history__step-head">
              <span className="charts-history__step-num">{monthStepNum}</span>
              <h3 className="charts-history__step-title">{step2Label}</h3>
              {yearForLabel != null || monthForLabel != null ? (
                <button type="button" className="charts-history__clear" onClick={() => clearFilters()}>
                  Clear
                </button>
              ) : null}
            </div>
            <div className="charts-history__pills charts-history__pills--months">
              {RV_CALENDAR_MONTHS.map((m) => {
                const hasData = monthsWithData.has(m);
                return (
                  <button
                    key={m}
                    type="button"
                    className={`charts-history__pill charts-history__pill--month${monthForLabel === m ? " charts-history__pill--filter" : ""}${hasData ? "" : " charts-history__pill--muted"}`}
                    aria-pressed={monthForLabel === m}
                    onClick={() => pickMonth(m)}
                  >
                    {monthLabel(m)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="charts-history__divider" aria-hidden>
            ↓
          </div>
        </>
      ) : null}

      {hasSnapshots ? (
        <div className="charts-history__step">
          <div className="charts-history__step-head">
            <span className="charts-history__step-num">{snapshotStepNum}</span>
            <h3 className="charts-history__step-title">{step3Label}</h3>
          </div>

          {singleSnapshots.length > 0 ? (
            <div className="charts-history__group">
              <h4 className="charts-history__group-title">Singles · Hot 100</h4>
              <ul className="charts-history__results">
                {singleSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
              </ul>
            </div>
          ) : null}

          {albumSnapshots.length > 0 ? (
            <div className="charts-history__group">
              <h4 className="charts-history__group-title">Albums · Album 200</h4>
              <ul className="charts-history__results charts-history__results--albums">
                {albumSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
              </ul>
            </div>
          ) : null}

          <p className="charts-history__range">
            {singleSnapshots.length > 0
              ? `${singleSnapshots.length} single${singleSnapshots.length === 1 ? "" : "s"}`
              : null}
            {singleSnapshots.length > 0 && albumSnapshots.length > 0 ? " · " : null}
            {albumSnapshots.length > 0
              ? `${albumSnapshots.length} album${albumSnapshots.length === 1 ? "" : "s"}`
              : null}{" "}
            for {monthForLabel != null ? monthLabel(monthForLabel) : "—"} {yearForLabel ?? ""}
          </p>
        </div>
      ) : yearForLabel != null && monthForLabel != null ? (
        <p className="charts-history__empty charts-history__empty--archival" role="status">
          No chart week on file for this month — the archive is quiet here.
        </p>
      ) : yearForLabel != null ? (
        <p className="charts-history__empty charts-history__empty--hint" role="status">
          Choose a month to open chart weeks from the archive.
        </p>
      ) : (
        <p className="charts-history__empty charts-history__empty--hint" role="status">
          Choose a year to browse months in the archive.
        </p>
      )}

    </section>
  );
}
