"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { formatChartDateLabel } from "@/lib/artist/chart-history-display";
import { movementLabel } from "@/lib/charts/chart-week-movement";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import type { ChartWeekPortalContext, ChartWeekPortalRow } from "@/lib/charts/chart-week-portal-types";
import { rvWeekHref, rvYearHref } from "@/lib/rv/rv-chronology-paths";
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
}: {
  row: ChartWeekPortalRow;
  isFocus: boolean;
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
        ) : (
          <span className="chart-week-portal__peek-hint">Tap to explore this spot</span>
        )}
      </div>
    </>
  );
}

export function ChartWeekPortalClient({ initial, focusQuery }: Props) {
  const [context, setContext] = useState(initial);
  const [loading, setLoading] = useState(false);

  const year = Number.parseInt(context.chartDate.slice(0, 4), 10);
  const month = Number.parseInt(context.chartDate.slice(5, 7), 10);
  const rvWeekLink = rvWeekHref(year, month, context.chartDate);

  const canExpandAbove = context.rangeFrom > context.chartMin;
  const canExpandBelow = context.rangeTo < context.chartMax;

  const backTrackHref = useMemo(() => {
    const focusRow = context.rows.find((r) => r.position === context.focusPosition);
    if (focusRow?.trackHref) return focusRow.trackHref;
    if (focusQuery && /^RVTR\d{6}$/i.test(focusQuery)) {
      return trackPageHref(focusQuery.toUpperCase());
    }
    return null;
  }, [context, focusQuery]);

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
        qs.set("rank", String(context.focusPosition));
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
    window.location.assign(href);
  };

  return (
    <div className="chart-week-portal-world">
      <div className="chart-week-portal-world__grain" aria-hidden />

      <header className="chart-week-portal-topbar">
        <Link href="/" className="chart-week-portal-logo" prefetch>
          Retroverse
        </Link>
        <span className="chart-week-portal-tag">Chart week</span>
      </header>

      <section className="chart-week-portal-hero" aria-labelledby="chart-week-portal-heading">
        <p className="chart-week-portal-hero__eyebrow">What surrounded this song?</p>
        <h1 id="chart-week-portal-heading" className="chart-week-portal-hero__title">
          {formatChartDateLabel(context.chartDate)}
        </h1>
        <p className="chart-week-portal-hero__lead">
          {context.chartLabel} · neighborhood #{context.rangeFrom}–#{context.rangeTo}
        </p>
        <Link href={rvWeekLink} prefetch className="chart-week-portal-hero__rv-link">
          Open full {year} week →
        </Link>
      </section>

      <section className="chart-week-portal-stack" aria-label="Chart neighborhood" aria-busy={loading}>
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
          {context.rows.map((row) => {
            const isFocus = row.position === context.focusPosition;
            if (isFocus) {
              return (
                <li
                  key={row.position}
                  className="chart-week-portal__row chart-week-portal__row--focus"
                  aria-current="true"
                >
                  <ChartWeekPortalRowBody row={row} isFocus />
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
        <Link href="/">← Home</Link>
        <Link href="/search">Search</Link>
        {backTrackHref ? <Link href={backTrackHref}>← Back to song</Link> : null}
        <Link href={rvYearHref(year)}>{year} chronicle</Link>
      </footer>
    </div>
  );
}
