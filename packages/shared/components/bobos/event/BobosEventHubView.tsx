import Link from "next/link";

import { BobosPageHeader } from "@/components/bobos/BobosPageHeader";
import { BOBOS_EVENT_HUB_ACTIONS } from "@/lib/bobos/event-hub-nav";
import type { ProductionBinder } from "@/lib/ops/event-studio/types";

type Props = {
  binder: ProductionBinder;
};

function statusTone(status: string): "planning" | "live" | "archived" | "neutral" {
  const key = status.toLowerCase();
  if (key === "planning") return "planning";
  if (key === "live") return "live";
  if (key === "archived") return "archived";
  return "neutral";
}

export function BobosEventHubView({ binder }: Props) {
  const { snapshot, checklist, progress } = binder;
  const yearsLabel = snapshot.featuredYears.join(" · ");

  return (
    <div className="bobos-page bobos-event-hub">
      <BobosPageHeader
        page="Event Hub"
        subtitle="Producer sets the plan. Design Builder handles passes and visual assets. Everything else follows from here."
        eventName={snapshot.eventName}
        status={snapshot.status}
        statusTone={statusTone(snapshot.status)}
      />

      <section className="bobos-event-hub__binder" aria-label="Production binder">
        <div className="bobos-event-hub__binder-head">
          <div>
            <p className="bobos-event-hub__binder-kicker">Production Binder</p>
            <h2 className="bobos-event-hub__binder-title">{snapshot.eventName}</h2>
          </div>
          <span className={`bobos-badge bobos-badge--${statusTone(snapshot.status)}`}>
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
