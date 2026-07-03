import type { Metadata } from "next";
import Link from "next/link";

import { OpsHealingPanel } from "@/components/ops/OpsHealingPanel";
import { loadHealingDegradedQueue } from "@/lib/healing/load-degraded-queue";
import { buildFamilyConsolidationReport } from "@/lib/healing/build-family-consolidation";
import { loadHealingRestorationPatterns } from "@/lib/healing/load-restoration-patterns";
import { loadHealingTrustCalibration } from "@/lib/healing/load-trust-calibration";
import { loadPublicContinuityReport } from "@/lib/healing/load-public-continuity-report";
import { loadHealingValidationReport } from "@/lib/healing/load-healing-validation";
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
  const trust = await loadHealingTrustCalibration(queue);
  const patterns = await loadHealingRestorationPatterns(queue, trust.eraPatterns);
  const [validation, continuity] = await Promise.all([
    loadHealingValidationReport(),
    loadPublicContinuityReport(),
  ]);
  const writesEnabled = healingWritesEnabled();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · restoration family consolidation</p>
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
          <strong>What restoration family is this?</strong> — recurring families, safe vs
          high-risk patterns, and public continuity impact. One approve at a time; curator-led only.
        </p>

        <OpsHealingPanel
          queue={queue}
          trust={trust}
          patterns={patterns}
          consolidation={buildFamilyConsolidationReport(
            queue,
            patterns,
            validation,
            continuity,
          )}
          validation={validation}
          continuity={continuity}
          writesEnabled={writesEnabled}
        />
      </div>
    </main>
  );
}
