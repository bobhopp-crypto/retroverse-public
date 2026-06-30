import Link from "next/link";
import type { ReactNode } from "react";

import { EVENT_STUDIO_NAV } from "@/lib/ops/event-studio/nav";
import type { EventStudioSection, EventStudioSnapshot } from "@/lib/ops/event-studio/types";

type Props = {
  active: EventStudioSection;
  snapshot: EventStudioSnapshot;
  title: string;
  lead?: string;
  /** Full-bleed workspace (Pass Generator) */
  workspace?: boolean;
  children: ReactNode;
};

export function EventStudioShell({
  active,
  snapshot,
  title,
  lead,
  workspace = false,
  children,
}: Props) {
  return (
    <main className={`ops-page ops-event-studio${workspace ? " ops-event-studio--workspace" : ""}`}>
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-event-studio__frame">
        <aside className="ops-event-studio__sidebar" aria-label="Event Studio">
          <div className="ops-event-studio__brand">
            <p className="ops-event-studio__kicker">Production hub</p>
            <Link href="/ops/event-studio" className="ops-event-studio__title">
              Event Studio
            </Link>
          </div>

          <section className="ops-event-studio__current" aria-label="Current event">
            <p className="ops-event-studio__current-label">Current Event</p>
            <p className="ops-event-studio__current-name">{snapshot.eventName}</p>
            <p className="ops-event-studio__current-meta">
              {snapshot.date}
              {snapshot.venue ? ` · ${snapshot.venue}` : null}
            </p>
            <span
              className={`ops-event-studio__status ops-event-studio__status--${snapshot.status.toLowerCase()}`}
            >
              {snapshot.status}
            </span>
          </section>

          <nav className="ops-event-studio__nav" aria-label="Event Studio sections">
            {EVENT_STUDIO_NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active === item.id ? "page" : undefined}
                className={
                  active === item.id
                    ? "ops-event-studio__nav-link ops-event-studio__nav-link--active"
                    : "ops-event-studio__nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ops-event-studio__sidebar-foot">
            <Link href="/ops/content-creator" className="ops-event-studio__legacy-link">
              Content Creator (legacy)
            </Link>
            <Link href="/ops" className="ops-event-studio__back">
              Command Center
            </Link>
          </div>
        </aside>

        <div className="ops-event-studio__main">
          {!workspace ? (
            <header className="ops-event-studio__head">
              <div>
                <p className="ops-event-studio__section-kicker">{snapshot.eventName}</p>
                <h1 className="ops-event-studio__page-title">{title}</h1>
                {lead ? <p className="ops-event-studio__page-lead">{lead}</p> : null}
              </div>
            </header>
          ) : null}
          {children}
        </div>
      </div>
    </main>
  );
}
