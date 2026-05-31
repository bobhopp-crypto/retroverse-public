import Link from "next/link";
import type { CSSProperties } from "react";

import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import { trajectoryMomentClasses } from "@/lib/track/trajectory-moment-classes";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";
import { resolveTrajectoryHistoricalHeat } from "@/lib/track/trajectory-historical-heat";

type Props = {
  weeks: TrackTrajectoryWeek[];
  peak: number | null;
  chartLabel?: string;
  scaleFloorLabel?: string;
  maxRank?: number;
  ariaLabel?: string;
  panelClassName?: string;
  visibleIndices?: number[];
  /** When set, each week row opens the chart-week neighborhood portal. */
  portalFocusTrackId?: string | null;
};

function formatChartDate(value: string): string {
  const d = value.slice(0, 10);
  if (d.length < 10) return value;
  const [y, m, day] = d.split("-");
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TrackChartRunRail({
  weeks,
  peak,
  chartLabel = "Billboard Hot 100",
  scaleFloorLabel = "#100",
  maxRank = 100,
  ariaLabel = "Song chart journey",
  panelClassName,
  visibleIndices,
  portalFocusTrackId = null,
}: Props) {
  if (weeks.length === 0) return null;

  const indices = visibleIndices ?? weeks.map((_, index) => index);
  const panelClass = ["track-trajectory-panel", panelClassName].filter(Boolean).join(" ");
  const portalEnabled = Boolean(portalFocusTrackId?.trim());

  return (
    <div className={panelClass} aria-label={ariaLabel}>
      {portalEnabled ? (
        <p className="track-trajectory-portal-hint">Tap a week to see what surrounded this song.</p>
      ) : null}
      <div className="track-trajectory-scale" aria-hidden>
        <span>{scaleFloorLabel}</span>
        <span>{chartLabel.replace(/^Billboard\s+/i, "")}</span>
        <span>#1</span>
      </div>
      <ol className="track-trajectory-rail">
        {indices.map((index) => {
          const week = weeks[index];
          if (!week) return null;
          const momentClasses = trajectoryMomentClasses(weeks, index);
          const heat = resolveTrajectoryHistoricalHeat(week, index, weeks, peak, maxRank);
          const portalHref =
            portalEnabled && week.issueDate
              ? chartWeekPortalHref(week.issueDate, {
                  focus: portalFocusTrackId,
                  rank: week.rank,
                })
              : null;

          const cardBody = (
            <>
              <div className="track-trajectory-date">
                <span>{formatChartDate(week.issueDate)}</span>
                <small>week {week.weeksOnChart ?? index + 1}</small>
              </div>
              <div className="track-trajectory-track" aria-hidden />
              <div className="track-trajectory-rank">
                <strong>#{week.rank}</strong>
              </div>
            </>
          );

          const className = `track-trajectory-week ${momentClasses}${
            portalHref ? " track-trajectory-week--portal" : ""
          }`.trim();

          const style = {
            "--rank-x": `${week.x}%`,
            "--heat-intensity": String(heat.intensity),
            "--heat-bg": heat.atmosphereBg,
            "--heat-border": heat.atmosphereBorder,
            "--heat-glow": heat.atmosphereGlow,
            "--heat-rail": heat.railTint,
            "--heat-bar": heat.barFill,
          } as CSSProperties;

          if (portalHref) {
            return (
              <li key={`${week.issueDate}-${index}`}>
                <Link
                  href={portalHref}
                  prefetch
                  className={className}
                  style={style}
                  aria-label={`Chart neighborhood for ${formatChartDate(week.issueDate)}, rank ${week.rank}`}
                >
                  {cardBody}
                </Link>
              </li>
            );
          }

          return (
            <li
              key={`${week.issueDate}-${index}`}
              className={className}
              style={style}
            >
              {cardBody}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
