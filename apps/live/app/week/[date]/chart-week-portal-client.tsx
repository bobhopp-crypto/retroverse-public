"use client";

import Link from "next/link";
import { useEffect } from "react";

import { formatChartDateLabel } from "@/lib/artist/chart-history-display";
import type { ChartWeekPortalContext, ChartWeekPortalRow } from "@/lib/charts/chart-week-portal-types";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import { buildYouTubeSearchUrl } from "@/lib/ops/youtube-search";
import { playTrackByRvtr } from "@/lib/playback/play-track-client";

import "./chart-week-portal.css";

type Props = {
  initial: ChartWeekPortalContext;
  operatorMode: boolean;
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

function ExplorerPlayButton({ row }: { row: ChartWeekPortalRow }) {
  const direct = rowHasDirectPlay(row);

  return (
    <button
      type="button"
      className="explorer-btn explorer-btn--play"
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
      <span aria-hidden>▶</span>
      <span>Play</span>
    </button>
  );
}

function ExplorerLibraryButton({ row }: { row: ChartWeekPortalRow }) {
  const inLibrary = row.coverageStatus === "owned";

  return (
    <button
      type="button"
      className={[
        "explorer-btn",
        inLibrary ? "explorer-btn--owned" : "explorer-btn--add",
      ].join(" ")}
      aria-label={
        inLibrary
          ? `${row.title} is in your VirtualDJ library`
          : `Add ${row.title} to your VirtualDJ library (coming soon)`
      }
      title={inLibrary ? "In VirtualDJ library" : "Add to VirtualDJ library (coming soon)"}
      disabled
    >
      {inLibrary ? "✓" : "+"}
    </button>
  );
}

function ExplorerRowActions({ row, operatorMode }: { row: ChartWeekPortalRow; operatorMode: boolean }) {
  return (
    <div className="explorer-row__actions">
      <ExplorerPlayButton row={row} />
      {operatorMode ? <ExplorerLibraryButton row={row} /> : null}
    </div>
  );
}

function ExplorerSongRow({
  row,
  isCurrent,
  operatorMode,
}: {
  row: ChartWeekPortalRow;
  isCurrent: boolean;
  operatorMode: boolean;
}) {
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
        {row.trackHref ? (
          <Link
            href={row.trackHref}
            prefetch
            className="explorer-row__hit"
            aria-label={`Open ${row.title} by ${row.artistName}`}
          >
            <span className="explorer-row__rank">
              {String(row.position).padStart(2, "0")}
            </span>
            <span className="explorer-row__text">
              <span className="explorer-row__title">{row.title}</span>
              <span className="explorer-row__artist">{row.artistName}</span>
            </span>
          </Link>
        ) : (
          <div className="explorer-row__hit explorer-row__hit--static">
            <span className="explorer-row__rank">
              {String(row.position).padStart(2, "0")}
            </span>
            <span className="explorer-row__text">
              <span className="explorer-row__title">{row.title}</span>
              <span className="explorer-row__artist">{row.artistName}</span>
            </span>
          </div>
        )}
        <ExplorerRowActions row={row} operatorMode={operatorMode} />
      </article>
    </li>
  );
}

export function ChartWeekPortalClient({ initial: context, operatorMode }: Props) {
  const headerDate = explorerHeaderDate(context.chartDate);
  const hasFocusedRow = context.focusPosition != null;

  useEffect(() => {
    if (!hasFocusedRow || context.focusPosition == null) return;
    const id = `explorer-row-${context.focusPosition}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [context.focusPosition, context.rows.length, hasFocusedRow]);

  return (
    <main
      className={
        operatorMode
          ? "chart-week-page chart-week-page--operator"
          : "chart-week-page"
      }
    >
      <div className="explorer">
        <header className="explorer__masthead">
          <h1 className="explorer__chart-name">{context.chartLabel}</h1>
          <p className="explorer__date">Week ending {headerDate}</p>
          <nav className="explorer__week-nav" aria-label="Chart week navigation">
            {context.previousChartDate ? (
              <Link href={chartWeekPortalHref(context.previousChartDate)} prefetch>
                ← Previous Week
              </Link>
            ) : (
              <span aria-disabled="true">← Previous Week</span>
            )}
            {context.nextChartDate ? (
              <Link href={chartWeekPortalHref(context.nextChartDate)} prefetch>
                Next Week →
              </Link>
            ) : (
              <span aria-disabled="true">Next Week →</span>
            )}
          </nav>
        </header>

        <div className="explorer__columns" aria-hidden="true">
          <span>#</span>
          <span>Title</span>
          <span>Artist</span>
        </div>

        <ol className="explorer-rows" aria-label={`${context.chartLabel} for week ending ${headerDate}`}>
          {context.rows.map((row) => (
            <ExplorerSongRow
              key={`${row.position}-${row.trackId}`}
              row={row}
              isCurrent={hasFocusedRow && row.position === context.focusPosition}
              operatorMode={operatorMode}
            />
          ))}
        </ol>
      </div>
    </main>
  );
}
