import type { Metadata } from "next";
import Link from "next/link";

import { OpsCoverReviewWorkbench } from "@/components/ops/OpsCoverReviewWorkbench";
import { loadRepairBatchCsv } from "@/lib/cover-integrity/load-repair-batch-csv";
import { loadRepairDecisions } from "@/lib/cover-integrity/repair-decisions-store";

import "../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cover Review — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsCoversPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page">
        <div className="ops-page__inner">
          <p className="ops-dim">Ops disabled (set RETROVERSE_OPS=1).</p>
        </div>
      </main>
    );
  }

  let batch: Awaited<ReturnType<typeof loadRepairBatchCsv>> = [];
  let loadError: string | null = null;

  try {
    batch = await loadRepairBatchCsv();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const decisionsState = await loadRepairDecisions();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · RV12 cover repair</p>
            <h1 className="ops-topbar__title">Cover Review</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              <Link className="ops-link" href="/ops">
                ← Ops
              </Link>
            </div>
            <div>Batch 001 · {batch.length} rows · human approve only</div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>RV12 workbench</strong> — review suspicious assignments from repair batch 001.
          Approve/reject records local decisions only; TRUSTED covers are not repair targets; no
          image or database writes.
        </p>

        {loadError ? (
          <p className="ops-cover-review__error">
            Could not load batch CSV: {loadError}. Run <code>npm run cover:repair-batch</code>.
          </p>
        ) : (
          <OpsCoverReviewWorkbench
            batch={batch}
            initialDecisions={decisionsState.decisions}
          />
        )}
      </div>
    </main>
  );
}
