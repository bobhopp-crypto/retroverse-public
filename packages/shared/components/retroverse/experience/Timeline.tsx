import type { ExperienceTimelineEvent } from "@/lib/chart-journey/derive-timeline-events";
import { formatTimelineEventDate } from "@/lib/chart-journey/derive-timeline-events";

import { TimelineEvent } from "./TimelineEvent";

type Props = {
  events: ExperienceTimelineEvent[];
  className?: string;
};

export function Timeline({ events, className }: Props) {
  if (events.length === 0) return null;

  const panelClass = ["rv-exp-timeline", className].filter(Boolean).join(" ");

  return (
    <section className={panelClass} aria-labelledby="rv-exp-timeline-heading">
      <header className="rv-exp-timeline__head">
        <p className="rv-exp-timeline__eyebrow">Timeline</p>
        <h3 id="rv-exp-timeline-heading">Historical Milestones</h3>
      </header>
      <ol className="rv-exp-timeline__list">
        {events.map((event) => (
          <TimelineEvent
            key={event.id}
            dateLabel={formatTimelineEventDate(event)}
            label={event.label}
            kind={event.kind}
          />
        ))}
      </ol>
    </section>
  );
}
