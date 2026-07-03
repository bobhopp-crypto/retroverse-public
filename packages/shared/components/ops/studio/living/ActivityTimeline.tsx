import type { LivingActivityEvent } from "@/lib/ops/studio/living/types";

type Props = {
  events: LivingActivityEvent[];
  title?: string;
  emptyMessage?: string;
};

export function ActivityTimeline({ events, title = "Activity", emptyMessage }: Props) {
  return (
    <section className="rs-living-timeline">
      <h2 className="rs-living-timeline__title">{title}</h2>
      {events.length === 0 ? (
        <p className="rs-living-timeline__empty">
          {emptyMessage ?? "Activity will appear here as work moves through the studio."}
        </p>
      ) : (
        <ol className="rs-living-timeline__list">
          {events.map((event) => (
            <li key={event.id} className="rs-living-timeline__item">
              <time className="rs-living-timeline__time">{event.timeLabel}</time>
              <span className="rs-living-timeline__msg">{event.message}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
