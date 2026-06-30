import Link from "next/link";

import type { EventStudioIdentity } from "@/lib/ops/event-studio/types";

type Props = {
  identity: EventStudioIdentity;
};

export function EventStudioIdentityPanel({ identity }: Props) {
  const yearsLabel = identity.featuredYears.join(" · ");

  return (
    <div className="ops-event-studio__identity">
      <section className="ops-event-studio__panel" aria-label="Event identity">
        <h2 className="ops-event-studio__panel-title">Source of Truth</h2>
        <p className="ops-event-studio__hint">
          Everything generated for this event inherits from these settings.
        </p>
        <dl className="ops-event-studio__facts">
          <div>
            <dt>Event Name</dt>
            <dd>{identity.eventName}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{identity.venue}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{identity.date}</dd>
          </div>
          <div>
            <dt>Theme</dt>
            <dd>{identity.theme}</dd>
          </div>
          <div>
            <dt>Featured Years</dt>
            <dd>{yearsLabel}</dd>
          </div>
          <div>
            <dt>Style Profile</dt>
            <dd>{identity.styleProfile}</dd>
          </div>
          <div>
            <dt>Color Palette</dt>
            <dd>
              <span className="ops-event-studio__palette-label">{identity.colorPaletteLabel}</span>
              <span className="ops-event-studio__swatches" aria-label="Color palette">
                {identity.colorSwatches.map((color) => (
                  <span key={color} className="ops-event-studio__swatch" style={{ background: color }} />
                ))}
              </span>
            </dd>
          </div>
          <div>
            <dt>Fonts</dt>
            <dd>{identity.fonts}</dd>
          </div>
          <div className="ops-event-studio__facts-wide">
            <dt>AI Prompt Profile</dt>
            <dd>{identity.aiPromptProfile}</dd>
          </div>
        </dl>
        <div className="ops-event-studio__actions">
          <Link href="/ops/event-control" className="ops-event-studio__action">
            Edit in Event Control
          </Link>
        </div>
      </section>
    </div>
  );
}
