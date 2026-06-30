import type { Metadata } from "next";

import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadEventStudioSnapshot } from "@/lib/ops/event-studio/load-event-snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assets — Event Studio",
  robots: { index: false, follow: false },
};

const ASSET_SLOTS = [
  "Poster artwork",
  "Pass artwork",
  "Hero images",
  "Social graphics",
  "Generated exports",
];

export default async function EventStudioAssetsPage() {
  const snapshot = await loadEventStudioSnapshot();

  return (
    <EventStudioShell
      active="assets"
      snapshot={snapshot}
      title="Assets"
      lead="Gallery for artwork and exports tied to this event."
    >
      <section className="ops-event-studio__panel" aria-label="Asset gallery">
        <h2 className="ops-event-studio__panel-title">Event Asset Gallery</h2>
        <p className="ops-event-studio__hint">
          Placeholder layout for poster artwork, pass artwork, hero images, and generated graphics.
        </p>
        <div className="ops-event-studio__assets-grid">
          {ASSET_SLOTS.map((label) => (
            <div key={label} className="ops-event-studio__asset-slot">
              {label}
            </div>
          ))}
        </div>
      </section>
    </EventStudioShell>
  );
}
