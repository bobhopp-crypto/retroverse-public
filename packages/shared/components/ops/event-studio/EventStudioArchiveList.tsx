import type { EventStudioArchiveEntry } from "@/lib/ops/event-studio/types";

type Props = {
  entries: EventStudioArchiveEntry[];
  currentEventName: string;
};

export function EventStudioArchiveList({ entries, currentEventName }: Props) {
  return (
    <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label="Event archive">
      <h2 className="ops-event-studio__panel-title">Previous Events</h2>
      <p className="ops-event-studio__hint">
        One binder per show. Currently producing <strong>{currentEventName}</strong>.
      </p>
      <ul className="ops-event-studio__archive">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={`ops-event-studio__archive-item ops-event-studio__archive-item--${entry.status}`}
          >
            <span>{entry.name}</span>
            <span className="ops-event-studio__archive-badge">
              {entry.status === "current" ? "Current" : entry.status === "past" ? "Archive" : "Future"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
