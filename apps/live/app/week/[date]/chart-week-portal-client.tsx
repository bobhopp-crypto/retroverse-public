"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { PublicTrackPlayButton } from "@/app/components/public-track-play-button";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { formatChartDateLabel } from "@/lib/artist/chart-history-display";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import type { ChartWeekPortalContext, ChartWeekPortalRow } from "@/lib/charts/chart-week-portal-types";
import { rvWeekHref } from "@/lib/rv/rv-chronology-paths";
import { trackPageHref } from "@/lib/search/entity-routes";

import "./chart-week-portal.css";

type Props = {
  initial: ChartWeekPortalContext;
  focusQuery: string | null;
};

function explorerHeaderDate(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return formatChartDateLabel(isoDate);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ExplorerIndicators({ row }: { row: ChartWeekPortalRow }) {
  const owned = row.coverageStatus === "owned";
  const hasYoutube = row.coverageStatus === "youtube";

  return (
    <>
      <span
        className={`explorer-ind explorer-ind--owned${owned ? "" : " explorer-ind--missing"}`}
        aria-label={owned ? "In library" : "Not in library"}
        title={owned ? "In library" : "Not in library"}
      />
      {hasYoutube ? (
        <span className="explorer-ind explorer-ind--youtube" aria-label="YouTube available" title="YouTube">
          YT
        </span>
      ) : null}
    </>
  );
}

function ExplorerRowActions({ row, isCurrent }: { row: ChartWeekPortalRow; isCurrent: boolean }) {
  const showAcquire = row.coverageStatus === "missing";
  const infoHref = row.trackHref;

  return (
    <div className="explorer-row__actions">
      {infoHref ? (
        <Link
          href={infoHref}
          prefetch
          className="explorer-btn explorer-btn--info"
          aria-label={`Song info for ${row.title}`}
        >
          Info
        </Link>
      ) : null}
      <PublicTrackPlayButton
        rvtr={row.rvtr}
        title={row.title}
        artist={row.artistName}
        className="explorer-btn explorer-btn--play"
        size={isCurrent ? "md" : "sm"}
      />
      {showAcquire ? (
        <button
          type="button"
          className="explorer-btn explorer-btn--acquire"
          aria-label={`Acquire ${row.title} into library (coming soon)`}
          disabled
          title="Acquire into VirtualDJ library (coming soon)"
        >
          +
        </button>
      ) : null}
    </div>
  );
}

function ExplorerSongRow({
  row,
  isCurrent,
  fullChart,
  onRefocus,
}: {
  row: ChartWeekPortalRow;
  isCurrent: boolean;
  fullChart: boolean;
  onRefocus?: () => void;
}) {
  const rowId = `explorer-row-${row.position}`;
  const rowClass = ["explorer-row", isCurrent ? "explorer-row--current" : ""].filter(Boolean).join(" ");

  const mainBlock = (
    <>
      <span className="explorer-row__rank">{row.position}</span>
      <div className="explorer-row__main">
        <ArtistCover
          src={row.coverUrl}
          alt=""
          className="explorer-row__art"
          fallbackClassName="explorer-row__art explorer-row__art--fallback"
          fallbackVariant="vinyl"
        />
        <div className="explorer-row__text">
          <p className="explorer-row__title">{row.title}</p>
          <p className="explorer-row__artist">{row.artistName}</p>
        </div>
      </div>
      <div className="explorer-row__meta">
        <ExplorerIndicators row={row} />
      </div>
    </>
  );

  const hitArea =
    !fullChart && !isCurrent && onRefocus ? (
      <button type="button" className="explorer-row__hit" onClick={onRefocus} aria-label={`Explore chart around ${row.title}`}>
        {mainBlock}
      </button>
    ) : (
      <div className="explorer-row__hit explorer-row__hit--static">{mainBlock}</div>
    );

  return (
    <li className="explorer-row-item">
      <article id={rowId} className={rowClass} aria-current={isCurrent ? "true" : undefined}>
        {hitArea}
        <ExplorerRowActions row={row} isCurrent={isCurrent} />
      </article>
    </li>
  );
}

export function ChartWeekPortalClient({ initial, focusQuery }: Props) {
  const router = useRouter();
  const [context, setContext] = useState(initial);
  const [loading, setLoading] = useState(false);

  const year = Number.parseInt(context.chartDate.slice(0, 4), 10);
  const month = Number.parseInt(context.chartDate.slice(5, 7), 10);
  const rvWeekLink = rvWeekHref(year, month, context.chartDate);
  const fullChart = context.focusPosition == null;
  const headerDate = explorerHeaderDate(context.chartDate);

  const backHref = useMemo(() => {
    if (fullChart) return rvWeekLink;
    const focusRow = context.rows.find((r) => r.position === context.focusPosition);
    if (focusRow?.trackHref) return focusRow.trackHref;
    if (focusQuery && /^RVTR\d{6}$/i.test(focusQuery)) {
      return trackPageHref(focusQuery.toUpperCase());
    }
    return rvWeekLink;
  }, [context, focusQuery, fullChart, rvWeekLink]);

  const canExpandAbove = context.rangeFrom > context.chartMin;
  const canExpandBelow = context.rangeTo < context.chartMax;

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

  useEffect(() => {
    if (fullChart || context.focusPosition == null) return;
    const id = `explorer-row-${context.focusPosition}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [context.focusPosition, context.rows.length, fullChart]);

  return (
    <Rv2PublicShell className="rv2-chart-week rv2-explorer" chartsHref="/retroverse-2/charts" activeNav="charts">
      <div className="explorer">
        <header className="explorer__header">
          <Link href={backHref} prefetch className="explorer__back">
            ← Back
          </Link>
          <h1 className="explorer__date">{headerDate}</h1>
        </header>

        <div className="explorer__list" aria-busy={loading} aria-label="Chart songs">
          {canExpandAbove ? (
            <button type="button" className="explorer-expand" disabled={loading} onClick={expandAbove}>
              More above
            </button>
          ) : null}

          <ol className="explorer-rows">
            {context.rows.map((row) => {
              const isCurrent = !fullChart && row.position === context.focusPosition;
              return (
                <ExplorerSongRow
                  key={`${row.position}-${row.trackId}`}
                  row={row}
                  isCurrent={isCurrent}
                  fullChart={fullChart}
                  onRefocus={!fullChart && !isCurrent ? () => refocusRow(row) : undefined}
                />
              );
            })}
          </ol>

          {canExpandBelow ? (
            <button type="button" className="explorer-expand" disabled={loading} onClick={expandBelow}>
              More below
            </button>
          ) : null}
        </div>
      </div>
    </Rv2PublicShell>
  );
}
