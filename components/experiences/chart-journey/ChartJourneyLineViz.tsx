"use client";

import type { ChartJourneyModel } from "@/lib/chart-journey/types";

type Props = {
  model: ChartJourneyModel;
  highlightIndex?: number;
  className?: string;
};

export function ChartJourneyLineViz({ model, highlightIndex, className }: Props) {
  const rows = model.rows;
  if (rows.length < 2) return null;

  const width = 320;
  const height = 160;
  const padX = 12;
  const padY = 16;
  const maxRank = model.maxRank;

  const points = rows.map((row, i) => {
    const x = padX + (i / Math.max(1, rows.length - 1)) * (width - padX * 2);
    const y = padY + ((row.week.rank - 1) / Math.max(1, maxRank - 1)) * (height - padY * 2);
    return { x, y, rank: row.week.rank, index: i };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const highlight = highlightIndex != null ? points[highlightIndex] : points.find((p) => p.rank === model.metrics.peakPosition);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={["cj-line-viz", className].filter(Boolean).join(" ")}
      role="img"
      aria-label="Chart position over time"
    >
      <defs>
        <linearGradient id="cjLineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a7a7a" />
          <stop offset="100%" stopColor="#e85d04" />
        </linearGradient>
      </defs>
      {[10, 25, 50, 75].map((rank) => {
        const y = padY + ((rank - 1) / (maxRank - 1)) * (height - padY * 2);
        return (
          <line
            key={rank}
            x1={padX}
            y1={y}
            x2={width - padX}
            y2={y}
            className="cj-line-viz__grid"
          />
        );
      })}
      <path d={pathD} className="cj-line-viz__path" fill="none" stroke="url(#cjLineGrad)" strokeWidth="3" />
      {points.map((p) => (
        <circle key={p.index} cx={p.x} cy={p.y} r={p.index === highlightIndex ? 5 : 2.5} className="cj-line-viz__dot" />
      ))}
      {highlight ? (
        <circle cx={highlight.x} cy={highlight.y} r={8} className="cj-line-viz__peak" />
      ) : null}
    </svg>
  );
}
