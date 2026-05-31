"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { OpsCoverAcquireWorkbench } from "@/components/ops/OpsCoverAcquireWorkbench";
import { OpsCoverTrainWorkbench } from "@/components/ops/OpsCoverTrainWorkbench";
import type { CoverAuditHashRow } from "@/lib/cover-integrity/load-cover-audit-csv";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import type { AcquireBatchRow } from "@/lib/ops/review/covers/acquire-batch";
import type { TrainingQueueReport } from "@/lib/cover-integrity/prepare-training-batch";
import type { CoverTrainingDecisionValue } from "@/lib/rv12/training-decisions";

export type CoverReviewTab = "integrity" | "acquire";

type Props = {
  tab: CoverReviewTab;
  batchSize: number;
  decisionCount: number;
  integrity: {
    batchId: string;
    batch: RepairBatchCsvRow[];
    manifestSize: number;
    hashMatches: Record<string, CoverAuditHashRow[]>;
    queueReport: TrainingQueueReport | null;
    loadError: string | null;
    emptyPool: boolean;
  };
  acquire: {
    batchId: string;
    batch: AcquireBatchRow[];
    loadError: string | null;
  };
  initialDecisions: Record<string, { decision: CoverTrainingDecisionValue }>;
};

const DECISIONS_API = "/api/ops/covers/train/decisions";

export function OpsCoverReviewTabs(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<CoverReviewTab>(props.tab);
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);
  const [retrainError, setRetrainError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const switchTab = (next: CoverReviewTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/ops/review/covers?${params.toString()}`);
  };

  const runRetrain = useCallback(async () => {
    setRetraining(true);
    setRetrainError(null);
    setRetrainMsg(null);
    try {
      const res = await fetch("/api/ops/review/covers/retrain", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        decisionCount?: number;
        needsPullBoost?: number;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Retrain failed");
      }
      setRetrainMsg(
        `Retrained on ${data.decisionCount ?? 0} decisions · needs-pull boost +${data.needsPullBoost ?? 0}`,
      );
    } catch (e) {
      setRetrainError(e instanceof Error ? e.message : String(e));
    } finally {
      setRetraining(false);
    }
  }, []);

  const generateIntegrityBatch = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/ops/review/covers/generate-integrity-batch", {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; size?: number };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Generate failed");
      }
      router.refresh();
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [router]);

  const integrityCompleted = props.integrity.batch.filter(
    (r) => props.initialDecisions[r.rval],
  ).length;
  const acquireCompleted = props.acquire.batch.filter(
    (r) => props.initialDecisions[r.rval],
  ).length;

  return (
    <>
      <header className="ops-cover-train__mission">
        <p className="ops-cover-train__mission-kicker">COVER REVIEW · RVAL</p>
        <h1 className="ops-cover-train__mission-title">
          Teach Retroverse which covers are correct — and which albums need art.
        </h1>
        <p className="ops-cover-train__mission-progress">
          Training examples: <strong>{props.decisionCount}</strong>
        </p>
        <Link className="ops-cover-train__back" href="/ops">
          ← Back to Ops
        </Link>
      </header>

      <nav className="ops-cover-review__tabs" aria-label="Cover review mode">
        <button
          type="button"
          className={`ops-cover-review__tab${tab === "integrity" ? " ops-cover-review__tab--on" : ""}`}
          aria-current={tab === "integrity" ? "page" : undefined}
          onClick={() => switchTab("integrity")}
        >
          Integrity
          <span className="ops-cover-review__tab-meta">wrong cover checks</span>
        </button>
        <button
          type="button"
          className={`ops-cover-review__tab${tab === "acquire" ? " ops-cover-review__tab--on" : ""}`}
          aria-current={tab === "acquire" ? "page" : undefined}
          onClick={() => switchTab("acquire")}
        >
          Acquire
          <span className="ops-cover-review__tab-meta">missing covers</span>
        </button>
      </nav>

      <div className="ops-cover-review__loop">
        <button
          type="button"
          className="ops-cover-review__retrain"
          disabled={retraining}
          onClick={() => void runRetrain()}
        >
          {retraining ? "Retraining…" : "Retrain weights"}
        </button>
        <p className="ops-cover-review__loop-hint">
          Review 10 → batch auto-retrains on complete → or retrain manually here.
        </p>
        {retrainMsg ? <p className="ops-cover-review__retrain-ok">{retrainMsg}</p> : null}
        {retrainError ? <p className="ops-cover-train__error">{retrainError}</p> : null}
      </div>

      {tab === "integrity" ? (
        <>
          <p className="ops-cover-train__mission-progress">
            Integrity batch {props.integrity.batchId}:{" "}
            <strong>{integrityCompleted}</strong> of {props.integrity.manifestSize || props.batchSize}{" "}
            completed
          </p>
          {props.integrity.queueReport ? (
            <p className="ops-cover-train__queue-report" aria-live="polite">
              Queue: {props.integrity.queueReport.totalInManifest} loaded ·{" "}
              {props.integrity.queueReport.removedIdentical} removed (same image) ·{" "}
              {props.integrity.queueReport.remaining} ready to review
            </p>
          ) : null}
          {props.integrity.loadError ? (
            <p className="ops-cover-train__error">{props.integrity.loadError}</p>
          ) : props.integrity.emptyPool || props.integrity.batch.length === 0 ? (
            <div className="ops-cover-review__empty">
              <p className="ops-cover-train__text">No integrity candidates currently available.</p>
              <button
                type="button"
                className="ops-cover-review__generate"
                disabled={generating}
                onClick={() => void generateIntegrityBatch()}
              >
                {generating ? "Generating…" : "Generate New Integrity Batch"}
              </button>
              {generateError ? <p className="ops-cover-train__error">{generateError}</p> : null}
            </div>
          ) : (
            <OpsCoverTrainWorkbench
              batchId={props.integrity.batchId}
              batch={props.integrity.batch}
              batchSize={props.batchSize}
              initialDecisions={props.initialDecisions}
              hashMatches={props.integrity.hashMatches}
              decisionsApi={DECISIONS_API}
              advanceBatchApi="/api/ops/review/covers/advance-batch?mode=integrity"
            />
          )}
        </>
      ) : (
        <>
          <p className="ops-cover-train__mission-progress">
            Acquire batch {props.acquire.batchId}: <strong>{acquireCompleted}</strong> of{" "}
            {props.acquire.batch.length || props.batchSize} completed
          </p>
          {props.acquire.loadError ? (
            <p className="ops-cover-train__error">{props.acquire.loadError}</p>
          ) : (
            <OpsCoverAcquireWorkbench
              batchId={props.acquire.batchId}
              batch={props.acquire.batch}
              batchSize={props.batchSize}
              initialDecisions={props.initialDecisions}
              decisionsApi={DECISIONS_API}
              advanceBatchApi="/api/ops/review/covers/advance-batch?mode=acquire"
            />
          )}
        </>
      )}

      <p className="ops-cover-train__operator-link">
        <Link className="ops-cover-train__operator-link-a" href="/ops/covers/corrections">
          Operator tools (canonical apply)
        </Link>
      </p>
    </>
  );
}
