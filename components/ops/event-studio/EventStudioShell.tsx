import Link from "next/link";
import type { ReactNode } from "react";

import { EVENT_STUDIO_SUNDAY_NAV } from "@/lib/ops/event-studio/nav";
import { loadProducerWorkflow } from "@/lib/ops/event-studio/producer/workflow";
import { productionModuleStatusLabel } from "@/lib/ops/event-studio/producer/module-status";
import type { EventStudioSection, EventStudioSnapshot } from "@/lib/ops/event-studio/types";

type Props = {
  active: EventStudioSection;
  snapshot: EventStudioSnapshot;
  title: string;
  lead?: string;
  workspace?: boolean;
  children: ReactNode;
};

export async function EventStudioShell({
  active,
  snapshot,
  title,
  lead,
  workspace = false,
  children,
}: Props) {
  const workflow = await loadProducerWorkflow().catch(() => null);

  return (
    <main className={`ops-page ops-event-studio${workspace ? " ops-event-studio--workspace" : ""}`}>
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-event-studio__frame">
        <aside className="ops-event-studio__sidebar" aria-label="Production binder">
          <div className="ops-event-studio__brand">
            <p className="ops-event-studio__kicker">Production binder</p>
            <Link href="/bobos/event" className="ops-event-studio__title">
              {snapshot.eventName}
            </Link>
          </div>

          <section className="ops-event-studio__current" aria-label="Current event">
            <p className="ops-event-studio__current-label">Producing</p>
            <p className="ops-event-studio__current-name">{snapshot.theme}</p>
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

          <nav className="ops-event-studio__nav" aria-label="Production binder sections">
            {EVENT_STUDIO_SUNDAY_NAV.map((item) => {
              const moduleStatus = workflow?.navStatuses[item.id];
              const showBadge =
                moduleStatus &&
                moduleStatus !== "NOT_STARTED" &&
                (moduleStatus !== "PUBLISHED" || item.id === "homepage");
              return (
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
                  <span className="ops-event-studio__nav-link-label">{item.label}</span>
                  {showBadge ? (
                    <span
                      className={`ops-event-studio__nav-badge ops-event-studio__nav-badge--${moduleStatus.toLowerCase().replace(/_/g, "-")}`}
                    >
                      {productionModuleStatusLabel(moduleStatus)}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="ops-event-studio__sidebar-foot">
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
