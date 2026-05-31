import type { CSSProperties } from "react";

import { peakChartJourney } from "@/lib/songs/chart-journey-from-peak";

type Props = {
  peak: number | null;
  maxRank?: number;
  className?: string;
};

export function ChartHistoryJourneyBar({ peak, maxRank = 100, className }: Props) {
  const journey = peakChartJourney(peak, maxRank);

  const style = {
    "--rank-x": `${journey.fillPct}%`,
    "--heat-intensity": String(journey.heat.intensity),
    "--heat-rail": journey.heat.railTint,
    "--heat-bar": journey.heat.barFill,
    "--heat-glow": journey.heat.atmosphereGlow,
  } as CSSProperties;

  const rootClass = ["chart-history-journey", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass} style={style} aria-label={`Peak ${journey.peakLabel}`}>
      <span className="chart-history-journey__peak">{journey.peakLabel}</span>
      <div className="chart-history-journey__track" aria-hidden />
    </div>
  );
}
