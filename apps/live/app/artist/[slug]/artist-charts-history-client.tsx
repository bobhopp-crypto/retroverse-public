"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  activeDecades,
  decadeLabel,
  formatChartDateLabel,
  formatMonthYearHeading,
  formatMonthYearLeadersHeading,
  formatNumberOneTiming,
  monthLabel,
  monthsWithChartData,
  monthChartSnapshotGroups,
  isAlbumChartSnapshot,
  RV_CALENDAR_MONTHS,
  weeklyEntriesFromHistory,
  yearsInDecade,
} from "@/lib/artist/chart-history-display";
import { monthRecordsDefinedCopy } from "@/lib/rv-year/rv-month-editorial";
import { countNumberOneWeeksInMonth } from "@/lib/artist/chart-snapshot-shaping";
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
import { trackHrefFromToken, albumHrefFromToken } from "@/lib/public/canonical-public-hrefs";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import {
  matchRvChronologyPath,
  parseRvWeekParam,
  rvChronologyPathFromState,
  rvWeekHref,
} from "@/lib/rv/rv-chronology-paths";
import { songActionTargetFromParts, rvtrFromToken } from "@/lib/songs/song-actions";
import { formatRvYearArtist, formatRvYearTitle } from "@/lib/rv-year/display-format";
import type {
  ArtistChartHistory,
  RvChartSnapshot,
} from "@/lib/artist/chart-history-types";

import { SongActions } from "@/app/components/song-actions";
import { TrackCoverageBadge } from "@/app/components/track-coverage-badge";
import "@/app/components/track-coverage.css";
import { coverageFromMap } from "@/lib/charts/track-coverage";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";
import { ArtistCover } from "./artist-cover";
import "./artist-charts-history.css";

type Props = {
  artistName: string;
  canonicalArtistId?: number | null;
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
  /** RV /rv/YEAR/MONTH — #1 leader cards, not full chart weeks. */
  rvChronologyLeaders?: boolean;
  /** Month comes from the URL — hide month pill grid. */
  lockMonthNavigation?: boolean;
  /** RVTR → coverage map from server (month/week drill). */
  coverageByRvtr?: Record<string, TrackCoverageStatus>;
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
    return albumHrefFromToken(snapshot.trackId);
  }
  if (!snapshot.chartName.includes("Hot 100")) return null;
  return trackHrefFromToken(snapshot.trackId);
}

export function ArtistChartsHistoryClient({
  artistName,
  canonicalArtistId = null,
  history: historyProp,
  highlightTrackIds,
  viewAllHref,
  hideBanner = false,
  initialRvYear = null,
  initialMonth = null,
  highlightChartDate = null,
  hideYearStep = false,
  rvChronologyLeaders = false,
  lockMonthNavigation = false,
  coverageByRvtr,
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
  const leaderMode = rvChronologyLeaders || syncRvChronologyUrl;
  const summaryMode = leaderMode && lockMonthNavigation;
  const hydratedRef = useRef(false);
  const applyingUrlRef = useRef(false);

  const artistStorageKey = useMemo(
    () => slugFromArtistName(artistName),
    [artistName],
  );
  const artistRouteToken =
    canonicalArtistId != null && Number.isInteger(canonicalArtistId) && canonicalArtistId > 0
      ? String(canonicalArtistId)
      : null;

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
    return monthChartSnapshotGroups(weeklyEntries, year, month, leaderMode ? 999 : 5);
  }, [weeklyEntries, selectedYear, selectedMonth, leaderMode]);

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

  /** RV drill: month → week route, then week route → chart week page. */
  const openChronologyWeek = (chartDate: string | undefined) => {
    if (!syncRvChronologyUrl) return;
    const key = chartDate?.trim().slice(0, 10) ?? "";
    if (!parseRvWeekParam(key)) return;
    const year = asPillNumber(selectedYear);
    const month = asPillNumber(selectedMonth);
    if (year == null || month == null) return;
    const rvHref = rvWeekHref(year, month, key);
    if (pathname === rvHref) {
      applyingUrlRef.current = true;
      router.push(chartWeekPortalHref(key), { scroll: false });
      queueMicrotask(() => {
        applyingUrlRef.current = false;
      });
      return;
    }
    pickWeek(chartDate);
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

    const displayTitle = leaderMode ? formatRvYearTitle(snapshot.title || "—") : snapshot.title || "—";
    const displayArtist = leaderMode
      ? formatRvYearArtist(snapshot.artist || artistName)
      : snapshot.artist || artistName;
    const timingLabel = leaderMode ? formatNumberOneTiming(snapshot) : formatChartDateLabel(snapshot.chartDate ?? "");
    const onRvWeekRoute =
      rvWeekNavHref != null && pathname === rvWeekNavHref;
    const chronologyCardLabel = onRvWeekRoute
      ? `Open chart for ${displayTitle}`
      : `Open week of ${formatChartDateLabel(snapshot.chartDate ?? weekKey)}`;

    const actionTarget = songActionTargetFromParts({
      title: snapshot.title,
      artist: snapshot.artist || artistName,
      rvtr: snapshot.trackId,
      href: entityHref,
      artistSlug: artistRouteToken,
      chartYear: snapshot.year,
      chartDate: snapshot.chartDate,
      chartsHref: chartsContextHref,
    });
    const showSongActions =
      !syncRvChronologyUrl &&
      !isAlbum &&
      (leaderMode ? Boolean(entityHref || rvtrFromToken(snapshot.trackId)) : true);
    const rowCoverage =
      !isAlbum && coverageByRvtr
        ? coverageFromMap(coverageByRvtr, snapshot.trackId)
        : null;

    if (summaryMode) {
      const titleNode = displayTitle;

      const summaryRow = (
        <>
          <div className="charts-summary-card__cover">
            <ArtistCover
              src={snapshot.coverUrl}
              alt=""
              className="charts-summary-card__cover-img"
              fallbackClassName="charts-summary-card__cover-fallback"
              fallbackVariant="vinyl"
            />
          </div>
          <div className="charts-summary-card__text">
            <h4 className="charts-summary-card__title">
              <span className="charts-summary-card__title-row">
                <span>{titleNode}</span>
                <TrackCoverageBadge status={rowCoverage} />
              </span>
            </h4>
            <p className="charts-summary-card__artist">{displayArtist}</p>
            <p className="charts-summary-card__timing">{timingLabel}</p>
          </div>
        </>
      );

      return (
        <li
          key={snapshot.id}
          className={`charts-summary-card${active ? " charts-summary-card--active" : ""}`}
        >
          {rvWeekNavHref ? (
            <button
              type="button"
              className="charts-summary-card__row charts-summary-card__hitbox"
              aria-label={chronologyCardLabel}
              aria-current={active ? "true" : undefined}
              onClick={() => openChronologyWeek(snapshot.chartDate)}
            >
              {summaryRow}
            </button>
          ) : (
            <div className="charts-summary-card__row">{summaryRow}</div>
          )}
          {showSongActions ? (
            <SongActions
              layout="inline"
              omitUnavailable
              className="charts-summary-card__actions"
              target={actionTarget}
            />
          ) : null}
        </li>
      );
    }

    const titleNode =
      entityHref && leaderMode && !syncRvChronologyUrl ? (
        <Link
          href={entityHref}
          prefetch
          className="charts-history-card__title-link"
          onClick={(event) => event.stopPropagation()}
        >
          {displayTitle}
        </Link>
      ) : (
        displayTitle
      );

    const cardMain = (
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
                    artist: displayArtist,
                    album: displayTitle,
                    releaseYear: snapshot.releaseYear ?? null,
                    rval: /^RVAL\d{6}$/i.test(snapshot.trackId)
                      ? snapshot.trackId.toUpperCase()
                      : undefined,
                  }
                : {
                    artist: displayArtist,
                    album: displayTitle,
                    releaseYear: snapshot.releaseYear ?? null,
                  }
            }
          />
        </div>
        <div className="charts-history-card__body">
          <h4 className="charts-history-card__title">
            <span className="charts-history-card__title-row">
              <span>{titleNode}</span>
              {rowCoverage ? <TrackCoverageBadge status={rowCoverage} /> : null}
            </span>
          </h4>
          <p className="charts-history-card__artist">{displayArtist}</p>
          {leaderMode ? (
            <p className="charts-history-card__chart-line">{snapshot.chartDisplayName}</p>
          ) : null}
          <p className="charts-history-card__facts">
            <span>{timingLabel}</span>
          </p>
        </div>
        <div className="charts-history-card__stamp">
          <span className="charts-history-card__stamp-peak">#{peak}</span>
          {leaderMode ? null : (
            <span className="charts-history-card__stamp-date">
              {formatChartDateLabel(snapshot.chartDate ?? "")}
            </span>
          )}
        </div>
      </>
    );

    return (
      <li
        key={snapshot.id}
        className={`charts-history-card${active ? " charts-history-card--active" : ""}${leaderMode ? " charts-history-card--leader" : ""}`}
      >
        {rvWeekNavHref ? (
          <button
            type="button"
            className="charts-history-card__hitbox"
            aria-label={chronologyCardLabel}
            aria-current={active ? "true" : undefined}
            onClick={() => openChronologyWeek(snapshot.chartDate)}
          >
            {cardMain}
          </button>
        ) : entityHref ? (
          <Link
            href={entityHref}
            prefetch
            className="charts-history-card__hitbox"
            aria-label={`Open ${displayTitle}`}
          >
            {cardMain}
          </Link>
        ) : (
          <div className="charts-history-card__hitbox charts-history-card__hitbox--static">{cardMain}</div>
        )}
        {showSongActions ? (
          <SongActions
            layout="inline"
            omitUnavailable
            className="charts-history-card__song-actions"
            target={actionTarget}
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

  const step2Label = leaderMode
    ? "Browse months"
    : useDecades
      ? decadeForLabel != null
        ? `SELECT MONTH (${decadeLabel(decadeForLabel)})`
        : "SELECT MONTH"
      : yearForLabel != null
        ? `SELECT MONTH (${yearForLabel})`
        : "SELECT MONTH";

  const step3Label =
    yearForLabel != null && monthForLabel != null
      ? leaderMode
        ? "New #1s this month"
        : formatMonthYearHeading(yearForLabel, monthForLabel)
      : leaderMode
        ? "CHART LEADERS"
        : "CHART RESULTS";

  const hot100WeekCount =
    yearForLabel != null && monthForLabel != null
      ? countNumberOneWeeksInMonth(weeklyEntries, yearForLabel, monthForLabel, "hot-100")
      : 0;
  const album200WeekCount =
    yearForLabel != null && monthForLabel != null
      ? countNumberOneWeeksInMonth(weeklyEntries, yearForLabel, monthForLabel, "album-200")
      : 0;

  const monthStepNum = hideYearStep ? 1 : 2;
  const snapshotStepNum = hideYearStep ? 2 : 3;
  const summaryHeading =
    yearForLabel != null && monthForLabel != null
      ? formatMonthYearLeadersHeading(yearForLabel, monthForLabel)
      : "This month in music";
  const summaryRecordTotal = singleSnapshots.length + albumSnapshots.length;

  return (
    <section
      className={`charts-history${leaderMode ? " charts-history--rv-chronology" : ""}${summaryMode ? " charts-history--rv-summary" : ""}`}
      aria-label={summaryMode ? summaryHeading : hideBanner ? `Chart history for ${artistName}` : undefined}
      aria-labelledby={summaryMode || hideBanner ? undefined : "charts-history-heading"}
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

      {yearForLabel != null && !summaryMode ? (
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
        summaryMode ? (
          <div className="charts-history__summary">
            <header className="charts-history__summary-head">
              <h2 className="charts-history__summary-title">{summaryHeading}</h2>
              <p className="charts-history__summary-subtitle">What America Was Listening To</p>
              <p className="charts-history__summary-meta">
                {monthRecordsDefinedCopy(summaryRecordTotal)}
              </p>
            </header>

            {singleSnapshots.length > 0 ? (
              <div className="charts-history__group charts-history__group--summary">
                <h3 className="charts-history__group-title">Singles</h3>
                <ul className="charts-history__summary-list">
                  {singleSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
                </ul>
              </div>
            ) : null}

            {albumSnapshots.length > 0 ? (
              <div className="charts-history__group charts-history__group--summary">
                <h3 className="charts-history__group-title">Albums</h3>
                <ul className="charts-history__summary-list">
                  {albumSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
        <div className="charts-history__step">
          <div className="charts-history__step-head">
            <span className="charts-history__step-num">{snapshotStepNum}</span>
            <h3 className="charts-history__step-title">{step3Label}</h3>
          </div>

          {singleSnapshots.length > 0 ? (
            <div className="charts-history__group">
              <h4 className="charts-history__group-title">Singles — Hot 100</h4>
              <ul className="charts-history__results">
                {singleSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
              </ul>
            </div>
          ) : null}

          {albumSnapshots.length > 0 ? (
            <div className="charts-history__group">
              <h4 className="charts-history__group-title">Albums — Billboard 200</h4>
              <ul className="charts-history__results charts-history__results--albums">
                {albumSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
              </ul>
            </div>
          ) : null}

          <p className="charts-history__range">
            {leaderMode ? (
              <>
                {singleSnapshots.length} new #1 single{singleSnapshots.length === 1 ? "" : "s"}
                {hot100WeekCount > 0 ? ` (${hot100WeekCount} chart week${hot100WeekCount === 1 ? "" : "s"} at #1)` : ""}
                {singleSnapshots.length > 0 && albumSnapshots.length > 0 ? " · " : null}
                {albumSnapshots.length > 0 ? (
                  <>
                    {albumSnapshots.length} new #1 album{albumSnapshots.length === 1 ? "" : "s"}
                    {album200WeekCount > 0
                      ? ` (${album200WeekCount} chart week${album200WeekCount === 1 ? "" : "s"} at #1)`
                      : ""}
                  </>
                ) : null}
              </>
            ) : (
              <>
                {singleSnapshots.length > 0
                  ? `${singleSnapshots.length} single${singleSnapshots.length === 1 ? "" : "s"}`
                  : null}
                {singleSnapshots.length > 0 && albumSnapshots.length > 0 ? " · " : null}
                {albumSnapshots.length > 0
                  ? `${albumSnapshots.length} album${albumSnapshots.length === 1 ? "" : "s"}`
                  : null}{" "}
                for {monthForLabel != null ? monthLabel(monthForLabel) : "—"} {yearForLabel ?? ""}
              </>
            )}
          </p>
        </div>
        )
      ) : yearForLabel != null && monthForLabel != null ? (
        <p className="charts-history__empty charts-history__empty--archival" role="status">
          {leaderMode
            ? "Nothing new reached the top this month."
            : "No chart activity on file for this month."}
        </p>
      ) : yearForLabel != null ? (
        <p className="charts-history__empty charts-history__empty--hint" role="status">
          {leaderMode
            ? "Pick a month to explore what was playing."
            : "Pick a month to open the weekly view."}
        </p>
      ) : (
        <p className="charts-history__empty charts-history__empty--hint" role="status">
          Pick a year to begin.
        </p>
      )}

    </section>
  );
}
