import type { TimelineEvent } from "@/lib/ops/intelligence/song-package-types";

import "./song-experience.css";

type Props = {
  events: TimelineEvent[];
  heading?: string;
  className?: string;
};

function formatYear(year: number | null): string {
  if (year != null && year > 0) return String(year);
  return "—";
}

export function BeyondTheCharts({ events, heading = "Beyond the Charts", className }: Props) {
  if (events.length === 0) return null;

  const sorted = [...events].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  const panelClass = ["rv-exp-chapter", "rv-exp-beyond", className].filter(Boolean).join(" ");
  const headingId = `rv-exp-beyond-${heading.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className={panelClass} aria-labelledby={headingId}>
      <header className="rv-exp-chapter__head">
        <h2 id={headingId}>{heading}</h2>
      </header>
      <ol className="rv-exp-beyond__list">
        {sorted.map((event) => (
          <li key={event.id} className="rv-exp-beyond__item">
            <span className="rv-exp-beyond__year">{formatYear(event.year)}</span>
            <span className="rv-exp-beyond__dot" aria-hidden />
            <div className="rv-exp-beyond__copy">
              <strong>{event.title}</strong>
              {event.description?.trim() ? <p>{event.description.trim()}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
