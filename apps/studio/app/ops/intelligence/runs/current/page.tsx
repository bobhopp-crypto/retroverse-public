import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { IntelligenceRunLivePanel } from "@/components/ops/intelligence/IntelligenceRunLivePanel";
import { loadIntelligenceRunProgress } from "@/lib/ops/intelligence/run-progress";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overnight Research Build — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function IntelligenceRunCurrentPage() {
  if (!isOpsEnabled()) notFound();

  const initialProgress = await loadIntelligenceRunProgress();

  return (
    <main
      className="intel-app"
      style={{ background: "#ffffff", color: "#111111", minHeight: "100vh" }}
    >
      <div className="intel-app__body">
        <Link className="intel-review__back" href="/ops/intelligence" prefetch={false}>
          ← Research Center
        </Link>

        <header className="intel-backfill__hero">
          <p className="intel-backfill__kicker">Top 500 VIDEO · Play Count DESC</p>
          <h1 className="intel-backfill__title">Overnight Research Build</h1>
          <p className="intel-backfill__lead">
            RVTR + cover required · full pipeline · failures skipped · progress saved after every
            song
          </p>
        </header>

        <IntelligenceRunLivePanel initialProgress={initialProgress} />

        <section className="intel-backfill__actions">
          <h2 className="intel-backfill__section-title">Run</h2>
          <pre className="intel-backfill__commands">{`npm run intelligence:overnight-build
npm run intelligence:overnight-build -- --limit 250`}</pre>
          <p className="intel-backfill__actions-lead">
            Report on completion: <code>reports/intelligence/overnight-build-report.md</code>
          </p>
          <p className="intel-backfill__actions-lead">
            Raw results: <code>reports/intelligence/runs/current/results.json</code>
          </p>
        </section>
      </div>
    </main>
  );
}
