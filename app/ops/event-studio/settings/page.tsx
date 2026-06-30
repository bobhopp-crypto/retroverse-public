import type { Metadata } from "next";
import Link from "next/link";

import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadEventStudioSnapshot } from "@/lib/ops/event-studio/load-event-snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioSettingsPage() {
  const snapshot = await loadEventStudioSnapshot();

  return (
    <EventStudioShell
      active="settings"
      snapshot={snapshot}
      title="Settings"
      lead="Event metadata and legacy tooling links."
    >
      <section className="ops-event-studio__panel" aria-label="Event settings">
        <h2 className="ops-event-studio__panel-title">Event metadata</h2>
        <p className="ops-event-studio__hint">
          Event name, venue, date, featured years, and homepage programming are edited in Event
          Control today.
        </p>
        <div className="ops-event-studio__actions">
          <Link href="/ops/event-control" className="ops-event-studio__action">
            Open Event Control
          </Link>
          <Link href="/ops/sunday-nights" className="ops-event-studio__action">
            Sunday Nights Admin
          </Link>
        </div>
      </section>

      <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label="Legacy routes">
        <h2 className="ops-event-studio__panel-title">Legacy Content Creator routes</h2>
        <p className="ops-event-studio__hint">
          All existing generators remain available until migration is complete.
        </p>
        <div className="ops-event-studio__actions">
          <Link href="/ops/content-creator" className="ops-event-studio__action">
            Collectible Library
          </Link>
          <Link href="/ops/content-creator/create" className="ops-event-studio__action">
            Pass Generator (legacy)
          </Link>
          <Link href="/ops/content-creator/debug" className="ops-event-studio__action">
            Debug tools
          </Link>
        </div>
      </section>
    </EventStudioShell>
  );
}
