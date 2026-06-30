import Link from "next/link";

import type { EventStudioSnapshot } from "@/lib/ops/event-studio/types";

type Props = {
  snapshot: EventStudioSnapshot;
};

export function EventStudioOverview({ snapshot }: Props) {
  const yearsLabel = snapshot.featuredYears.join(" · ");

  return (
    <div className="ops-event-studio__overview">
      <section className="ops-event-studio__panel" aria-label="Event summary">
        <h2 className="ops-event-studio__panel-title">Event Summary</h2>
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
            <dt>Featured Years</dt>
            <dd>{yearsLabel}</dd>
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
        </dl>
      </section>

      <section className="ops-event-studio__panel" aria-label="Quick actions">
        <h2 className="ops-event-studio__panel-title">Quick Actions</h2>
        <div className="ops-event-studio__actions">
          <Link href="/ops/event-studio/print/pass-generator" className="ops-event-studio__action">
            Pass Generator
          </Link>
          <Link href="/ops/event-studio/print" className="ops-event-studio__action">
            Print Suite
          </Link>
          <Link href="/ops/event-control" className="ops-event-studio__action">
            Event Control
          </Link>
          <Link href="/ops/content-creator" className="ops-event-studio__action">
            Collectible Library
          </Link>
          <Link href="/ops/sunday-nights" className="ops-event-studio__action">
            Sunday Nights
          </Link>
        </div>
      </section>

      <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label="Production map">
        <h2 className="ops-event-studio__panel-title">Production Map</h2>
        <ul className="ops-event-studio__tree">
          <li>
            <strong>{snapshot.eventName}</strong>
            <ul>
              <li>Landing Page</li>
              <li>Passes</li>
              <li>Poster</li>
              <li>Facebook</li>
              <li>Instagram</li>
              <li>Giveaways</li>
              <li>Registration</li>
              <li>Assets</li>
              <li>AI Prompt Profiles</li>
            </ul>
          </li>
        </ul>
        <p className="ops-event-studio__hint">
          One event owns everything related to that show. Sections below are placeholders until each
          generator ships.
        </p>
      </section>
    </div>
  );
}
