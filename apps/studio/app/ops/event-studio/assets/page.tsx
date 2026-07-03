import type { Metadata } from "next";

import { EventStudioAssetLibrary } from "@/components/ops/event-studio/EventStudioAssetLibrary";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assets — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioAssetsPage() {
  const binder = await loadProductionBinder();

  return (
    <EventStudioShell
      active="assets"
      snapshot={binder.snapshot}
      title="Assets"
      lead="Approved artwork library for this event."
    >
      <EventStudioAssetLibrary assets={binder.assets} />
    </EventStudioShell>
  );
}
