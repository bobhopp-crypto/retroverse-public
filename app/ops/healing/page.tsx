import type { Metadata } from "next";
import Link from "next/link";

import { OpsHealingPanel } from "@/components/ops/OpsHealingPanel";
import { loadHealingReviewSet } from "@/lib/healing/load-review-set";
import { healingWritesEnabled } from "@/lib/track/album-link-recovery/guardrails";

import "../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Healing Review — Retroverse Ops",
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

  const review = await loadHealingReviewSet("stand_by_me");

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · canonical healing</p>
            <h1 className="ops-topbar__title">Album links</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              <Link className="ops-link" href="/ops">
                ← Ops
              </Link>
            </div>
            <div>Preview + human approve · no auto-apply</div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>Missing canonical_album_tracks</strong> — first healing pass. Stand By Me
          cluster (≤20 tracks). Confidence reports only until you approve a single candidate.
        </p>

        <OpsHealingPanel review={review} writesEnabled={healingWritesEnabled()} />
      </div>
    </main>
  );
}
