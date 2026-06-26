"use client";

import { useId, useState } from "react";
import Link from "next/link";

import { buildRowExpandBullets } from "@/lib/chart-journey/chart-journey-story";
import { formatChartJourneyDate } from "@/lib/chart-journey/build-chart-journey";
import type { ChartJourneyGap, ChartJourneyModel, ChartJourneyRow } from "@/lib/chart-journey/types";

type Props = {
  row: ChartJourneyRow;
  model: ChartJourneyModel;
  gap?: ChartJourneyGap;
  timelineLabels?: string[];
};

export function ChartJourneyRowView({
  row,
  model,
  gap,
  timelineLabels = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const { week } = row;

  const rowBody = (
    <>
      <span className="rv-exp-cj__date">{row.dateLabel}</span>
      <span className="rv-exp-cj__bar-wrap" aria-hidden>
        <span
          className="rv-exp-cj__bar"
          style={{
            width: `${row.barWidthPct}%`,
            backgroundColor: row.barColor,
          }}
        />
      </span>
      <span className="rv-exp-cj__rank">#{week.rank}</span>
    </>
  );

  const rowClass = [
    "rv-exp-cj__row",
    week.rank === 1 ? "rv-exp-cj__row--number-one" : "",
    open ? "rv-exp-cj__row--open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const interactiveProps = {
    className: rowClass,
    "aria-expanded": open,
    "aria-controls": detailId,
    onClick: () => setOpen((value) => !value),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    },
  };

  const bullets = buildRowExpandBullets({
    row,
    model,
    gap: gap ? { weeksAbsent: gap.weeksAbsent } : undefined,
    timelineLabels,
  });

  return (
    <li className="rv-exp-cj__row-item">
      {gap ? (
        <div className="rv-exp-cj__gap" role="separator" aria-label="Off chart gap">
          <span className="rv-exp-cj__gap-line" aria-hidden />
        </div>
      ) : null}
      <div {...interactiveProps} role="button" tabIndex={0}>
        {rowBody}
      </div>
      {open ? (
        <div id={detailId} className="rv-exp-cj__detail" role="region" aria-label="Chart week details">
          <p className="rv-exp-cj__detail-headline">{formatChartJourneyDate(row.detail.date)}</p>
          <ul className="rv-exp-cj__detail-list">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          {row.context.href ? (
            <Link href={row.context.href} prefetch className="rv-exp-cj__detail-link">
              View chart week →
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
