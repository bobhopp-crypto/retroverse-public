import type { Metadata } from "next";
import Link from "next/link";

import { OpsCoverTrainWorkbench } from "@/components/ops/OpsCoverTrainWorkbench";
import { loadHashMatchIndexForBatch } from "@/lib/cover-integrity/load-cover-audit-csv";
import { prepareTrainingBatchForUi } from "@/lib/cover-integrity/prepare-training-batch";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import { loadTrainingBatchRows, TRAINING_BATCH_SIZE } from "@/lib/cover-integrity/training-batch";
import { loadTrainingDecisions } from "@/lib/rv12/training-decisions";

import "../../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Album Cover Check — Retroverse",
  robots: { index: false, follow: false },
};

export default async function OpsCoverTrainPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page ops-page--train">
        <div className="ops-page__inner ops-page__inner--train">
          <p className="ops-cover-train__text">This page is not available.</p>
        </div>
      </main>
    );
  }

  let batchId = "001";
  let batch: Awaited<ReturnType<typeof loadTrainingBatchRows>>["rows"] = [];
  let manifestRows: RepairBatchCsvRow[] = [];
  let hashMatches: Awaited<ReturnType<typeof loadHashMatchIndexForBatch>> = {};
  let loadError: string | null = null;

  try {
    const loaded = await loadTrainingBatchRows();
    batchId = loaded.manifest.batchId;
    manifestRows = loaded.rows;
    const hashes = loaded.rows.map((r) => r.currentHash).filter((h): h is string => !!h);
    hashMatches = await loadHashMatchIndexForBatch(hashes);
    const prepared = await prepareTrainingBatchForUi(loaded.rows, hashMatches);
    batch = prepared.rows;
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const training = await loadTrainingDecisions();
  const initialDecisions = Object.fromEntries(
    Object.entries(training.byRval).map(([rval, d]) => [rval, { decision: d.decision }]),
  );

  const setSize = manifestRows.length || TRAINING_BATCH_SIZE;
  const completedInBatch = manifestRows.filter((r) => initialDecisions[r.rval]).length;

  return (
    <main className="ops-page ops-page--train">
      <div className="ops-page__grain ops-page__grain--train" aria-hidden />
      <div className="ops-page__inner ops-page__inner--train">
        <header className="ops-cover-train__mission">
          <p className="ops-cover-train__mission-kicker">REVIEW {TRAINING_BATCH_SIZE} COVERS</p>
          <h1 className="ops-cover-train__mission-title">
            Help Retroverse learn which album covers are correct.
          </h1>
          <p className="ops-cover-train__mission-progress">
            Progress: <strong>{completedInBatch}</strong> of {setSize} completed
          </p>
          <Link className="ops-cover-train__back" href="/ops">
            ← Back
          </Link>
        </header>

        {loadError ? (
          <p className="ops-cover-train__error">
            We couldn&apos;t load covers to review. Please ask an operator to help.
          </p>
        ) : (
          <OpsCoverTrainWorkbench
            batchId={batchId}
            batch={batch}
            batchSize={TRAINING_BATCH_SIZE}
            initialDecisions={initialDecisions}
            hashMatches={hashMatches}
          />
        )}

        <p className="ops-cover-train__operator-link">
          <Link className="ops-cover-train__operator-link-a" href="/ops/covers/corrections">
            Operator tools
          </Link>
        </p>
      </div>
    </main>
  );
}
