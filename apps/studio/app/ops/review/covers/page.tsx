import type { Metadata } from "next";
import { Suspense } from "react";

import { OpsCoverReviewTabs, type CoverReviewTab } from "@/components/ops/OpsCoverReviewTabs";
import { loadHashMatchIndexForBatch } from "@/lib/cover-integrity/load-cover-audit-csv";
import {
  prepareTrainingBatchForUi,
  type TrainingQueueReport,
} from "@/lib/cover-integrity/prepare-training-batch";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import { loadTrainingBatchRows, TRAINING_BATCH_SIZE } from "@/lib/cover-integrity/training-batch";
import { loadAcquireBatchRows } from "@/lib/ops/review/covers/acquire-batch";
import { loadTrainingDecisions } from "@/lib/rv12/training-decisions";

import "../../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cover Review — Retroverse Ops",
  robots: { index: false, follow: false },
};

function parseTab(raw: string | undefined): CoverReviewTab {
  return raw === "acquire" ? "acquire" : "integrity";
}

export default async function OpsCoverReviewPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page ops-page--train">
        <div className="ops-page__inner ops-page__inner--train">
          <p className="ops-cover-train__text">This page is not available.</p>
        </div>
      </main>
    );
  }

  const searchParams = await props.searchParams;
  const tab = parseTab(searchParams.tab);

  let integrityBatchId = "001";
  let integrityBatch: RepairBatchCsvRow[] = [];
  let manifestRows: RepairBatchCsvRow[] = [];
  let hashMatches: Awaited<ReturnType<typeof loadHashMatchIndexForBatch>> = {};
  let integrityLoadError: string | null = null;
  let integrityEmptyPool = false;
  let queueReport: TrainingQueueReport | null = null;

  let acquireBatchId = "001";
  let acquireBatch: Awaited<ReturnType<typeof loadAcquireBatchRows>>["rows"] = [];
  let acquireLoadError: string | null = null;

  try {
    const loaded = await loadTrainingBatchRows();
    integrityBatchId = loaded.manifest.batchId;
    integrityEmptyPool = loaded.emptyPool;
    if (!loaded.emptyPool) {
      manifestRows = loaded.rows;
      const hashes = loaded.rows.map((r) => r.currentHash).filter((h): h is string => !!h);
      hashMatches = await loadHashMatchIndexForBatch(hashes);
      const prepared = await prepareTrainingBatchForUi(loaded.rows, hashMatches);
      integrityBatch = prepared.rows;
      queueReport = prepared.queueReport;
    }
  } catch (e) {
    integrityLoadError = e instanceof Error ? e.message : String(e);
  }

  try {
    const loaded = await loadAcquireBatchRows();
    acquireBatchId = loaded.manifest.batchId;
    acquireBatch = loaded.rows;
  } catch (e) {
    acquireLoadError = e instanceof Error ? e.message : String(e);
  }

  const training = await loadTrainingDecisions();
  const initialDecisions = Object.fromEntries(
    Object.entries(training.byRval).map(([rval, d]) => [rval, { decision: d.decision }]),
  );

  return (
    <main className="ops-page ops-page--train ops-page--review">
      <div className="ops-page__grain ops-page__grain--train" aria-hidden />
      <div className="ops-page__inner ops-page__inner--train">
        <Suspense fallback={<p className="ops-cover-train__text">Loading…</p>}>
          <OpsCoverReviewTabs
            tab={tab}
            batchSize={TRAINING_BATCH_SIZE}
            decisionCount={training.entries.length}
            initialDecisions={initialDecisions}
            integrity={{
              batchId: integrityBatchId,
              batch: integrityBatch,
              manifestSize: manifestRows.length,
              hashMatches,
              queueReport,
              loadError: integrityLoadError,
              emptyPool: integrityEmptyPool,
            }}
            acquire={{
              batchId: acquireBatchId,
              batch: acquireBatch,
              loadError: acquireLoadError,
            }}
          />
        </Suspense>
      </div>
    </main>
  );
}
