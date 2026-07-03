"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { TrackCoverageBadge, TrackCoverageFilterBar } from "@/app/components/track-coverage-badge";
import "@/app/components/track-coverage.css";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { formatChartDateLabel, monthLabel } from "@/lib/artist/chart-history-display";
import { movementLabel } from "@/lib/charts/chart-week-movement";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import type { ChartWeekPortalContext, ChartWeekPortalRow } from "@/lib/charts/chart-week-portal-types";
import { coverageMatchesFilter, type CoverageFilter } from "@/lib/charts/track-coverage";
import { rvMonthHref, rvWeekHref, rvYearHref } from "@/lib/rv/rv-chronology-paths";
import { trackPageHref } from "@/lib/search/entity-routes";

import "./chart-week-portal.css";

type Props = {
  initial: ChartWeekPortalContext;
  focusQuery: string | null;
};

function movementBadge(prev: number | null, position: number): string {
  const move = movementLabel(position, prev);
  if (move === "up") return "↑ Rising";
  if (move === "down") return "↓ Falling";
  if (move === "new") return "★ New";
  if (move === "same") return "→ Holding";
  return "";
}

function ChartWeekPortalRowBody({
  row,
  isFocus,
  fullChart = false,
}: {
  row: ChartWeekPortalRow;
  isFocus: boolean;
  fullChart?: boolean;
}) {
  const move = movementBadge(row.prevPosition, row.position);
  const peak =
    row.peakHot100 != null && row.peakHot100 > 0 ? `#${row.peakHot100} peak` : null;
  const weeks =
    row.weeksOnChart > 0
      ? row.weeksOnChart === 1
        ? "1 wk"
        : `${row.weeksOnChart} wks`
      : null;
  const stats = [peak, weeks, move].filter(Boolean).join(" · ");

  return (
    <>
      <div className="chart-week-portal__rank-col">
        <span className="chart-week-portal__rank">#{row.position}</span>
        {row.prevPosition != null && row.prevPosition !== row.position ? (
          <span className="chart-week-portal__rank-prev">was #{row.prevPosition}</span>
        ) : null}
      </div>
      <div className="chart-week-portal__cover">
        <ArtistCover
          src={row.coverUrl}
          alt=""
          className="chart-week-portal__cover-img"
          fallbackClassName="chart-week-portal__cover-fallback"
          fallbackVariant="vinyl"
        />
      </div>
      <div className="chart-week-portal__body">
        <div className="chart-week-portal__body-head">
          {row.trackHref ? (
            <Link
              href={row.trackHref}
              prefetch
              className="chart-week-portal__title-link"
              onClick={(e) => e.stopPropagation()}
            >
              {row.title}
            </Link>
          ) : (
            <span className="chart-week-portal__title-text">{row.title}</span>
          )}
          <TrackCoverageBadge status={row.coverageStatus} />
        </div>
        <Link
          href={row.artistHref}
          prefetch
          className="chart-week-portal__artist-link"
          onClick={(e) => e.stopPropagation()}
        >
          {row.artistName}
        </Link>
        {stats ? <p className="chart-week-portal__stats">{stats}</p> : null}
        {isFocus ? (
          <span className="chart-week-portal__focus-badge">Your song · chart neighborhood</span>
        ) : fullChart ? null : (
          <span className="chart-week-portal__peek-hint">Tap to explore this spot</span>
        )}
      </div>
    </>
  );
}

export function ChartWeekPortalClient({ initial, focusQuery }: Props) {
  const router = useRouter();
  const [context, setContext] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");

  const year = Number.parseInt(context.chartDate.slice(0, 4), 10);
  const month = Number.parseInt(context.chartDate.slice(5, 7), 10);
  const rvWeekLink = rvWeekHref(year, month, context.chartDate);
  const fullChart = context.focusPosition == null;

  const visibleRows = useMemo(
    () => context.rows.filter((row) => coverageMatchesFilter(row.coverageStatus, coverageFilter)),
    [context.rows, coverageFilter],
  );

  const canExpandAbove = context.rangeFrom > context.chartMin;
  const canExpandBelow = context.rangeTo < context.chartMax;

  const backTrackHref = useMemo(() => {
    if (fullChart) return null;
    const focusRow = context.rows.find((r) => r.position === context.focusPosition);
    if (focusRow?.trackHref) return focusRow.trackHref;
    if (focusQuery && /^RVTR\d{6}$/i.test(focusQuery)) {
      return trackPageHref(focusQuery.toUpperCase());
    }
    return null;
  }, [context, focusQuery, fullChart]);

  const fetchRange = useCallback(
    async (from: number, to: number) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          date: context.chartDate,
          from: String(from),
          to: String(to),
        });
        if (focusQuery) qs.set("focus", focusQuery);
        if (context.focusPosition != null) {
          qs.set("rank", String(context.focusPosition));
        }
        const res = await fetch(`/api/charts/week?${qs.toString()}`, { cache: "no-store" });
        const body = await res.json();
        if (body.ok && body.context) setContext(body.context as ChartWeekPortalContext);
      } finally {
        setLoading(false);
      }
    },
    [context.chartDate, context.focusPosition, focusQuery],
  );

  const expandAbove = () => {
    if (!canExpandAbove || loading) return;
    const span = context.rangeTo - context.rangeFrom + 1;
    const nextFrom = Math.max(context.chartMin, context.rangeFrom - span);
    void fetchRange(nextFrom, context.rangeTo);
  };

  const expandBelow = () => {
    if (!canExpandBelow || loading) return;
    const span = context.rangeTo - context.rangeFrom + 1;
    const nextTo = Math.min(context.chartMax, context.rangeTo + span);
    void fetchRange(context.rangeFrom, nextTo);
  };

  const refocusRow = (row: ChartWeekPortalRow) => {
    const href = chartWeekPortalHref(context.chartDate, {
      focus: row.rvtr ?? row.trackId,
      rank: row.position,
    });
    router.push(href);
  };

  const rangeLabel =
    context.rangeFrom === context.chartMin && context.rangeTo === context.chartMax
      ? `#${context.chartMin}–#${context.chartMax}`
      : `#${context.rangeFrom}–#${context.rangeTo}`;

  const weekDateLabel = formatChartDateLabel(context.chartDate);

  return (
    <Rv2PublicShell
      className="rv2-chart-week"
      yearsHref={rvYearHref(year)}
      chartsHref="/retroverse-2/charts"
      activeNav="charts"
    >
      <div className="chart-week-portal">
        <nav className="chart-week-portal__crumb" aria-label="Where you are">
          <Link href={rvYearHref(year)} prefetch className="chart-week-portal__crumb-link">
            {year}
          </Link>
          <span className="chart-week-portal__crumb-sep" aria-hidden>
            /
          </span>
          <Link href={rvMonthHref(year, month)} prefetch className="chart-week-portal__crumb-link">
            {monthLabel(month)}
          </Link>
          <span className="chart-week-portal__crumb-sep" aria-hidden>
            /
          </span>
          <Link href={rvWeekLink} prefetch className="chart-week-portal__crumb-link">
            {weekDateLabel}
          </Link>
          <span className="chart-week-portal__crumb-sep" aria-hidden>
            /
          </span>
          <span className="chart-week-portal__crumb-current" aria-current="page">
            Chart
          </span>
        </nav>

        <section className="chart-week-portal-hero" aria-labelledby="chart-week-portal-heading">
          <p className="chart-week-portal-hero__eyebrow">
            {fullChart ? "Billboard Hot 100" : "What surrounded this song?"}
          </p>
          <h1 id="chart-week-portal-heading" className="chart-week-portal-hero__title">
            {weekDateLabel}
          </h1>
          <p className="chart-week-portal-hero__lead">
            {context.chartLabel} · {fullChart ? `full chart ${rangeLabel}` : `neighborhood ${rangeLabel}`}
          </p>
          <Link href={rvWeekLink} prefetch className="chart-week-portal-hero__rv-link">
            ← Back to {weekDateLabel} week
          </Link>
        </section>

        <section
          className="chart-week-portal-stack"
          aria-label={fullChart ? "Billboard Hot 100 chart" : "Chart neighborhood"}
          aria-busy={loading}
        >
        <TrackCoverageFilterBar value={coverageFilter} onChange={setCoverageFilter} />

        {canExpandAbove ? (
            <button
              type="button"
              className="chart-week-portal-expand"
              disabled={loading}
              onClick={expandAbove}
            >
              More above
            </button>
          ) : null}

        <ol className="chart-week-portal-list">
          {visibleRows.length === 0 ? (
            <li className="chart-week-portal__empty" role="status">
              No songs match this coverage filter.
            </li>
          ) : null}
          {visibleRows.map((row) => {
              const isFocus = !fullChart && row.position === context.focusPosition;
              if (isFocus) {
                return (
                  <li
                    key={row.position}
                    className="chart-week-portal__row chart-week-portal__row--focus"
                    aria-current="true"
                  >
                    <ChartWeekPortalRowBody row={row} isFocus fullChart={fullChart} />
                  </li>
                );
              }
              if (fullChart) {
                return (
                  <li key={row.position} className="chart-week-portal__row">
                    <ChartWeekPortalRowBody row={row} isFocus={false} fullChart />
                  </li>
                );
              }
              return (
                <li key={row.position} className="chart-week-portal__row">
                  <button
                    type="button"
                    className="chart-week-portal-row-btn"
                    onClick={() => refocusRow(row)}
                    aria-label={`Explore chart neighborhood around ${row.title}`}
                  >
                    <ChartWeekPortalRowBody row={row} isFocus={false} />
                  </button>
                </li>
              );
            })}
          </ol>

          {canExpandBelow ? (
            <button
              type="button"
              className="chart-week-portal-expand"
              disabled={loading}
              onClick={expandBelow}
            >
              More below
            </button>
          ) : null}
        </section>

        <footer className="chart-week-portal-footer">
          <Link href={rvWeekLink}>← Week</Link>
          <Link href="/">Home</Link>
          <Link href="/search">Search</Link>
          {backTrackHref ? <Link href={backTrackHref}>← Back to song</Link> : null}
          <Link href={rvYearHref(year)}>{year} chronicle</Link>
        </footer>
      </div>
    </Rv2PublicShell>
  );
}
