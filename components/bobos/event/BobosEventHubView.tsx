import Link from "next/link";

import { BOBOS_EVENT_HUB_ACTIONS } from "@/lib/bobos/event-hub-nav";
import type { ProductionBinder } from "@/lib/ops/event-studio/types";

type Props = {
  binder: ProductionBinder;
};

export function BobosEventHubView({ binder }: Props) {
  const { snapshot, checklist, progress } = binder;
  const yearsLabel = snapshot.featuredYears.join(" · ");

  return (
    <div className="bobos-event-hub">
      <header className="bobos-event-hub__hero">
        <p className="bobos-event-hub__kicker">BobOS · Sunday Production</p>
        <h1 className="bobos-event-hub__title">Event Hub</h1>
        <p className="bobos-event-hub__lead">
          Producer sets the plan. Pass Studio prints the passes. Everything else follows from here.
        </p>
      </header>

      <section className="bobos-event-hub__binder" aria-label="Production binder">
        <div className="bobos-event-hub__binder-head">
          <div>
            <p className="bobos-event-hub__binder-kicker">Production Binder</p>
            <h2 className="bobos-event-hub__binder-title">{snapshot.eventName}</h2>
          </div>
          <span
            className={`bobos-event-hub__status bobos-event-hub__status--${snapshot.status.toLowerCase()}`}
          >
            {snapshot.status}
          </span>
        </div>

        <dl className="bobos-event-hub__facts">
          <div>
            <dt>Venue</dt>
            <dd>{snapshot.venue}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{snapshot.date}</dd>
          </div>
          <div>
            <dt>Theme</dt>
            <dd>{snapshot.theme}</dd>
          </div>
          <div>
            <dt>Featured Years</dt>
            <dd>{yearsLabel || "—"}</dd>
          </div>
        </dl>

        <div className="bobos-event-hub__progress" aria-label="Production progress">
          <div className="bobos-event-hub__progress-head">
            <span>Checklist</span>
            <strong>
              {progress.done}/{progress.total} · {progress.percent}%
            </strong>
          </div>
          <div className="bobos-event-hub__progress-bar" role="presentation">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <ul className="bobos-event-hub__checklist">
            {checklist.map((item) => (
              <li key={item.id} className={item.done ? "is-done" : "is-open"}>
                {item.href ? (
                  <Link href={item.href}>
                    <span aria-hidden>{item.done ? "✓" : "○"}</span>
                    {item.label}
                  </Link>
                ) : (
                  <>
                    <span aria-hidden>{item.done ? "✓" : "○"}</span>
                    {item.label}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bobos-event-hub__actions" aria-label="Event production tools">
        <h2 className="bobos-event-hub__actions-title">Go To</h2>
        <div className="bobos-event-hub__action-grid">
          {BOBOS_EVENT_HUB_ACTIONS.map((action) => (
            <Link key={action.id} href={action.href} className="bobos-event-hub__action">
              <span className="bobos-event-hub__action-label">{action.label}</span>
              <span className="bobos-event-hub__action-desc">{action.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
