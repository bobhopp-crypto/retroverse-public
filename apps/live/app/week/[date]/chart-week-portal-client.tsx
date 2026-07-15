"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { formatChartDateLabel, monthLabel } from "@/lib/artist/chart-history-display";
import type { ChartWeekPortalContext, ChartWeekPortalRow } from "@/lib/charts/chart-week-portal-types";
import { buildYouTubeSearchUrl } from "@/lib/ops/youtube-search";
import { playTrackByRvtr } from "@/lib/playback/play-track-client";
import { rvMonthHref } from "@/lib/rv/rv-chronology-paths";

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

/** Owned (VDJ) or matched YouTube track — use existing playback resolver. */
function rowHasDirectPlay(row: ChartWeekPortalRow): boolean {
  return row.coverageStatus === "owned" || row.coverageStatus === "youtube";
}

function ExplorerPlayButton({ row, isCurrent }: { row: ChartWeekPortalRow; isCurrent: boolean }) {
  const direct = rowHasDirectPlay(row);

  return (
    <button
      type="button"
      className={[
        "explorer-btn",
        "explorer-btn--play",
        isCurrent ? "explorer-btn--play-current" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Play ${row.title} by ${row.artistName}`}
      onClick={(event) => {
        event.stopPropagation();
        if (direct && row.rvtr) {
          void playTrackByRvtr({ rvtr: row.rvtr, title: row.title, artist: row.artistName });
          return;
        }
        window.open(buildYouTubeSearchUrl(row.artistName, row.title), "_blank", "noopener,noreferrer");
      }}
    >
      ▶
    </button>
  );
}

function ExplorerLibraryButton({ row }: { row: ChartWeekPortalRow }) {
  return (
    <button
      type="button"
      className="explorer-btn explorer-btn--add"
      aria-label={`Add ${row.title} by ${row.artistName}`}
      title={`Add ${row.title}`}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      +
    </button>
  );
}

function ExplorerRowActions({ row, isCurrent }: { row: ChartWeekPortalRow; isCurrent: boolean }) {
  return (
    <div className="explorer-row__actions">
      <ExplorerPlayButton row={row} isCurrent={isCurrent} />
      <ExplorerLibraryButton row={row} />
    </div>
  );
}

function ExplorerSongRow({ row, isCurrent }: { row: ChartWeekPortalRow; isCurrent: boolean }) {
  const rowId = `explorer-row-${row.position}`;
  const rowClass = [
    "explorer-row",
    row.position === 1 ? "explorer-row--number-one" : "",
    row.coverageStatus === "owned" ? "explorer-row--owned" : "",
    isCurrent ? "explorer-row--current" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="explorer-row-item">
      <article id={rowId} className={rowClass} aria-current={isCurrent ? "true" : undefined}>
        <span className="explorer-row__rank">{row.position}</span>
        <div className="explorer-row__text">
          {row.trackHref ? (
            <Link href={row.trackHref} prefetch className="explorer-row__title">
              {row.title}
            </Link>
          ) : (
            <p className="explorer-row__title">{row.title}</p>
          )}
          <Link href={row.artistHref} prefetch className="explorer-row__artist">
            {row.artistName}
          </Link>
        </div>
        <ExplorerRowActions row={row} isCurrent={isCurrent} />
      </article>
    </li>
  );
}

export function ChartWeekPortalClient({ initial, focusQuery }: Props) {
  const [context, setContext] = useState(initial);
  const [loading, setLoading] = useState(false);

  const year = Number.parseInt(context.chartDate.slice(0, 4), 10);
  const month = Number.parseInt(context.chartDate.slice(5, 7), 10);
  const fullChart = context.focusPosition == null;
  const headerDate = explorerHeaderDate(context.chartDate);

  const backHref = rvMonthHref(year, month);
  const backLabel = `${monthLabel(month)} ${year}`;

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
          <RetroverseBack
            fallbackHref={backHref}
            fallbackLabel={backLabel}
            className="explorer__back"
          />
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
