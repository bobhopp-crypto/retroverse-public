import type { Metadata } from "next";
import Link from "next/link";

import { OpsHealingPanel } from "@/components/ops/OpsHealingPanel";
import { loadHealingDegradedQueue } from "@/lib/healing/load-degraded-queue";
import { healingWritesEnabled } from "@/lib/track/album-link-recovery/guardrails";

import "../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Healing Console — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsHealingPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page">
        <div className="ops-page__inner">
          <p className="ops-dim">Ops disabled (RETROVERSE_OPS=1 required).</p>
        </div>
      </main>
    );
  }

  const queue = await loadHealingDegradedQueue();
  const writesEnabled = healingWritesEnabled();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · restoration visibility</p>
            <h1 className="ops-topbar__title">Healing Console</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              <Link className="ops-link" href="/ops">
                ← Ops
              </Link>
            </div>
            <div>
              {writesEnabled
                ? "Controlled writes on · one approve per candidate"
                : "Read-only until RETROVERSE_HEALING_APPLY=1"}
            </div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>Archive restoration desk</strong> — prioritize degradation, review weighted
          candidates, then approve one album link at a time. No bulk apply, merge, or auto-heal.
        </p>

        <OpsHealingPanel queue={queue} writesEnabled={writesEnabled} />
      </div>
    </main>
  );
}
