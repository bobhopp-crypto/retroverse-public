import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VNextWorkspace } from "@/components/ops/content-creator/VNextWorkspace";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { inspectPing } from "@/lib/inspect/pg";
import { loadContentCreatorEras } from "@/lib/ops/content-creator/load-era-options";
import { loadEventStudioSnapshot } from "@/lib/ops/event-studio/load-event-snapshot";

import "../../content-creator/content-creator.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pass Generator — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioPassGeneratorPage() {
  const snapshot = await loadEventStudioSnapshot();
  const ping = await inspectPing();

  if (!ping.ok) {
    return (
      <EventStudioShell active="print" snapshot={snapshot} title="Pass Generator" workspace>
        <p style={{ padding: "2rem" }}>Database offline.</p>
      </EventStudioShell>
    );
  }

  try {
    const eras = await loadContentCreatorEras();
    return (
      <EventStudioShell active="print" snapshot={snapshot} title="Pass Generator" workspace>
        <div className="ops-event-studio__workspace-bar">
          <div>
            <h1>Pass Generator</h1>
            <p>{snapshot.eventName} · Print</p>
          </div>
          <div>
            <Link href="/ops/event-studio/print" className="ops-event-studio__workspace-link">
              ← Print suite
            </Link>
            {" · "}
            <Link href="/ops/content-creator/create" className="ops-event-studio__workspace-link">
              Legacy route
            </Link>
          </div>
        </div>
        <div className="ops-event-studio__workspace-body">
          <main className="ops-page ops-page--content-creator cc-creator-page">
            <Suspense fallback={<p style={{ padding: "2rem" }}>Loading…</p>}>
              <VNextWorkspace eras={eras} />
            </Suspense>
          </main>
        </div>
      </EventStudioShell>
    );
  } catch {
    notFound();
  }
}
