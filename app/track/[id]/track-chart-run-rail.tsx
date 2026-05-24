import type { CSSProperties } from "react";

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
  /** Optional extra class on the panel root (e.g. album journey tone). */
  panelClassName?: string;
  /** When set, only render these indices (full `weeks` still used for heat context). */
  visibleIndices?: number[];
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
}: Props) {
  if (weeks.length === 0) return null;

  const indices = visibleIndices ?? weeks.map((_, index) => index);
  const panelClass = ["track-trajectory-panel", panelClassName].filter(Boolean).join(" ");

  return (
    <div className={panelClass} aria-label={ariaLabel}>
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
          return (
            <li
              key={`${week.issueDate}-${index}`}
              className={`track-trajectory-week ${momentClasses}`.trim()}
              style={
                {
                  "--rank-x": `${week.x}%`,
                  "--heat-intensity": String(heat.intensity),
                  "--heat-bg": heat.atmosphereBg,
                  "--heat-border": heat.atmosphereBorder,
                  "--heat-glow": heat.atmosphereGlow,
                  "--heat-rail": heat.railTint,
                  "--heat-bar": heat.barFill,
                } as CSSProperties
              }
            >
              <div className="track-trajectory-date">
                <span>{formatChartDate(week.issueDate)}</span>
                <small>week {week.weeksOnChart ?? index + 1}</small>
              </div>
              <div className="track-trajectory-track" aria-hidden />
              <div className="track-trajectory-rank">
                <strong>#{week.rank}</strong>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
