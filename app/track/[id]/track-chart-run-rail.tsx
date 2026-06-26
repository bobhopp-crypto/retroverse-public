import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

import { ChartJourney } from "@/components/chart-journey/ChartJourney";

type Props = {
  weeks: TrackTrajectoryWeek[];
  peak: number | null;
  chartLabel?: string;
  scaleFloorLabel?: string;
  maxRank?: number;
  ariaLabel?: string;
  panelClassName?: string;
  visibleIndices?: number[];
  portalFocusTrackId?: string | null;
};

/** @deprecated Use ChartJourney directly. Thin compatibility wrapper. */
export function TrackChartRunRail({
  weeks,
  peak,
  chartLabel,
  maxRank,
  panelClassName,
  portalFocusTrackId,
}: Props) {
  return (
    <ChartJourney
      weeks={weeks}
      peak={peak}
      chartLabel={chartLabel}
      maxRank={maxRank}
      focusTrackId={portalFocusTrackId}
      variant="exhibit"
      className={panelClassName}
    />
  );
}
