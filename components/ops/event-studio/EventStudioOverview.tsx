import Link from "next/link";

import { EVENT_STUDIO_QUICK_ACTIONS } from "@/lib/ops/event-studio/nav";
import type { ProductionBinder } from "@/lib/ops/event-studio/types";

type Props = {
  binder: ProductionBinder;
};

export function EventStudioOverview({ binder }: Props) {
  const { snapshot, checklist, progress } = binder;
  const yearsLabel = snapshot.featuredYears.join(" · ");

  return (
    <div className="ops-event-studio__overview">
      <section className="ops-event-studio__panel" aria-label="Mission dashboard">
        <h2 className="ops-event-studio__panel-title">Mission Dashboard</h2>
        <dl className="ops-event-studio__facts">
          <div>
            <dt>Event Name</dt>
            <dd>{snapshot.eventName}</dd>
          </div>
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
            <dt>Status</dt>
            <dd>
              <span
                className={`ops-event-studio__status ops-event-studio__status--${snapshot.status.toLowerCase()}`}
              >
                {snapshot.status}
              </span>
            </dd>
          </div>
          <div>
            <dt>Featured Years</dt>
            <dd>{yearsLabel}</dd>
          </div>
        </dl>

        <div className="ops-event-studio__progress" aria-label="Production progress">
          <div className="ops-event-studio__progress-head">
            <span>Progress</span>
            <strong>
              {progress.done}/{progress.total} · {progress.percent}%
            </strong>
          </div>
          <div className="ops-event-studio__progress-bar" role="presentation">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </section>

      <section className="ops-event-studio__panel" aria-label="Production checklist">
        <h2 className="ops-event-studio__panel-title">Production Checklist</h2>
        <ul className="ops-event-studio__checklist">
          {checklist.map((item) => (
            <li key={item.id} className={item.done ? "is-done" : "is-open"}>
              {item.href ? (
                <Link href={item.href}>
                  <span className="ops-event-studio__check-icon" aria-hidden>
                    {item.done ? "✓" : "○"}
                  </span>
                  {item.label}
                </Link>
              ) : (
                <>
                  <span className="ops-event-studio__check-icon" aria-hidden>
                    {item.done ? "✓" : "○"}
                  </span>
                  {item.label}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label="Quick actions">
        <h2 className="ops-event-studio__panel-title">Quick Actions</h2>
        <div className="ops-event-studio__actions">
          {EVENT_STUDIO_QUICK_ACTIONS.map((action) => (
            <Link key={action.label} href={action.href} className="ops-event-studio__action">
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
