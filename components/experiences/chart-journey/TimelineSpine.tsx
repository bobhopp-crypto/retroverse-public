"use client";

import type { ChartJourneyTimelineWeek } from "@/lib/experiences/chart-journey/types";

type Props = {
  weeks: ChartJourneyTimelineWeek[];
  focusWeekIndex: number | null;
  onSelectWeek: (index: number) => void;
  onExpandTimeline: () => void;
};

export function TimelineSpine({ weeks, focusWeekIndex, onSelectWeek, onExpandTimeline }: Props) {
  if (weeks.length === 0) return null;

  return (
    <section className="cj-spine" aria-label="Chart timeline spine">
      <div className="cj-spine__head">
        <h3>Chart spine</h3>
        <button type="button" className="cj-spine__expand" onClick={onExpandTimeline}>
          Open full timeline →
        </button>
      </div>
      <div className="cj-spine__track" role="list">
        {weeks.map((week) => (
          <button
            key={week.weekIndex}
            type="button"
            role="listitem"
            className={
              focusWeekIndex === week.weekIndex
                ? "cj-spine__tick is-active"
                : week.linkedChapterIds.length > 0
                  ? "cj-spine__tick is-milestone"
                  : "cj-spine__tick"
            }
            style={{ flexGrow: week.barWidthPct }}
            title={`${week.dateLabel} · #${week.rank}`}
            aria-label={`Week ${week.weeksOnChart}, rank ${week.rank}, ${week.dateLabel}`}
            onClick={() => onSelectWeek(week.weekIndex)}
          />
        ))}
      </div>
      <p className="cj-spine__hint">Tap any week · milestone ticks mark story beats</p>
    </section>
  );
}
