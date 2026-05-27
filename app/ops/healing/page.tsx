import type { Metadata } from "next";
import Link from "next/link";

import { OpsHealingPanel } from "@/components/ops/OpsHealingPanel";
import { loadHealingDegradedQueue } from "@/lib/healing/load-degraded-queue";

import "../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Canonical Healing — Retroverse Ops",
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

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · canonical enrichment healing</p>
            <h1 className="ops-topbar__title">Healing v1</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              <Link className="ops-link" href="/ops">
                ← Ops
              </Link>
            </div>
            <div>Read-only · visibility first · no auto-merge</div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>Human-guided archive restoration</strong> — missing album links, covers,
          duplicate RVTR clusters, orphan VDJ tracks. Review candidates and confidence
          reasoning before any future write pass.
        </p>

        <OpsHealingPanel queue={queue} />
      </div>
    </main>
  );
}
