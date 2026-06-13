import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventControlWorkspace } from "@/components/ops/event-control/EventControlWorkspace";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../ops.css";
import "./event-control.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event Control — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function EventControlPage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  const config = await loadEventControlConfig();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Homepage editor</p>
            <h1 className="ops-topbar__title">Homepage</h1>
            <p className="ops-topbar__sub">
              Magazine cover + featured years — live preview while you edit.
            </p>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops">
              ← Ops
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/live">
              Event Command Center
            </Link>
          </div>
        </header>

        <EventControlWorkspace initial={config} />
      </div>
    </main>
  );
}
