import type { Metadata } from "next";
import Link from "next/link";

import { OpsCoverReviewWorkbench } from "@/components/ops/OpsCoverReviewWorkbench";
import { loadHashMatchIndexForBatch } from "@/lib/cover-integrity/load-cover-audit-csv";
import { loadRepairBatchCsv } from "@/lib/cover-integrity/load-repair-batch-csv";
import { loadRepairDecisions } from "@/lib/cover-integrity/repair-decisions-store";
import { coverApplyEnabled } from "@/lib/rv12/guardrails";

import "../../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cover Fixes (Operators) — Retroverse",
  robots: { index: false, follow: false },
};

export default async function OpsCoverCorrectionsPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page">
        <div className="ops-page__inner">
          <p className="ops-dim">This page is not available.</p>
        </div>
      </main>
    );
  }

  let batch: Awaited<ReturnType<typeof loadRepairBatchCsv>> = [];
  let hashMatches: Awaited<ReturnType<typeof loadHashMatchIndexForBatch>> = {};
  let loadError: string | null = null;

  try {
    batch = await loadRepairBatchCsv();
    const hashes = batch.map((r) => r.currentHash).filter((h): h is string => !!h);
    hashMatches = await loadHashMatchIndexForBatch(hashes);
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
            <p className="ops-topbar__kicker">Operators only</p>
            <h1 className="ops-topbar__title">Fix Album Covers</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/covers/train">
              ← Helper review
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops">
              Ops
            </Link>
          </div>
        </header>

        <p className="ops-banner ops-banner--operator">
          <strong>For experienced operators.</strong> Upload images, search Discogs, and apply final
          cover fixes. Helpers should use{" "}
          <Link href="/ops/covers/train">Album Cover Check</Link> instead.
        </p>

        {loadError ? (
          <p className="ops-cover-train__friendly-error">
            Could not load the cover list. Run the repair batch setup or ask for help.
          </p>
        ) : (
          <OpsCoverReviewWorkbench
            batch={batch}
            initialDecisions={decisionsState.decisions}
            hashMatches={hashMatches}
            coverApplyEnabled={coverApplyEnabled()}
          />
        )}
      </div>
    </main>
  );
}
