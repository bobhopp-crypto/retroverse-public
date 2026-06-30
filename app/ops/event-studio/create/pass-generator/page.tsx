import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VNextWorkspace } from "@/components/ops/content-creator/VNextWorkspace";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { inspectPing } from "@/lib/inspect/pg";
import { loadContentCreatorEras } from "@/lib/ops/content-creator/load-era-options";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Generate Pass — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioPassGeneratorPage() {
  const binder = await loadProductionBinder();
  const ping = await inspectPing();

  if (!ping.ok) {
    return (
      <EventStudioShell active="passes" snapshot={binder.snapshot} title="Generate Pass" workspace>
        <p style={{ padding: "2rem" }}>Database offline.</p>
      </EventStudioShell>
    );
  }

  try {
    const eras = await loadContentCreatorEras();
    return (
      <EventStudioShell active="passes" snapshot={binder.snapshot} title="Generate Pass" workspace>
        <div className="ops-event-studio__workspace-bar">
          <div>
            <h1>Generate Pass</h1>
            <p>
              {binder.snapshot.eventName} · Create · inherits {binder.identity.theme}
            </p>
          </div>
          <Link href="/ops/event-studio/create" className="ops-event-studio__workspace-link">
            ← Create
          </Link>
        </div>
        <div className="ops-event-studio__workspace-body">
          <div className="ops-event-studio__generator ops-page--content-creator cc-creator-page">
            <Suspense fallback={<p style={{ padding: "2rem" }}>Loading…</p>}>
              <VNextWorkspace eras={eras} />
            </Suspense>
          </div>
        </div>
      </EventStudioShell>
    );
  } catch {
    notFound();
  }
}
