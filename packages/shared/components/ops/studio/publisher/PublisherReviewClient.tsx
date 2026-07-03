"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ExperienceScorecardPanel } from "./ExperienceScorecardPanel";
import { ExperienceCriticPanel } from "./ExperienceCriticPanel";
import { GoldenPackageButton } from "./GoldenPackageButton";
import { SimilarExperiencePanel } from "./SimilarExperiencePanel";
import { VisualProducerReviewPanel } from "./VisualProducerReviewPanel";
import { TrainingRendererPreview } from "@/components/ops/studio/training/TrainingRendererPreview";
import type { DirectorPackage } from "@/lib/ops/studio/director/types";
import type { PublicExperiencePayload } from "@/lib/retroverse/renderer/load-public-experience";
import type { VisualProductionPlan } from "@/lib/ops/studio/publisher/visual-producer/types";
import type {
  PublisherDecisionAction,
  PublisherRecord,
} from "@/lib/ops/studio/publisher/types";

type Props = {
  record: PublisherRecord;
  director: DirectorPackage;
  preview: PublicExperiencePayload | null;
  visualProduction: VisualProductionPlan | null;
  isGolden?: boolean;
};

const APPROVE_ACTIONS: Array<{ action: PublisherDecisionAction; label: string }> = [
  { action: "approve", label: "Approve" },
  { action: "approve_extended", label: "Approve as Extended" },
  { action: "approve_showcase", label: "Approve as Showcase" },
];

const RETURN_ACTIONS: Array<{ action: PublisherDecisionAction; label: string }> = [
  { action: "return_editor", label: "Return to Editor" },
  { action: "return_director", label: "Return to Director" },
];

export function PublisherReviewClient({ record, director, preview, visualProduction, isGolden = false }: Props) {
  const router = useRouter();
  const evaluation = record.evaluation;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const reasonOptions = [
    ...(evaluation?.coachingIssues ?? []),
    ...(evaluation?.blockingIssues ?? []),
    ...(evaluation?.optionalGaps ?? []),
    "Editorial polish needed",
    "Story arc incomplete",
    "Visual rhythm needs work",
  ].filter((v, i, a) => a.indexOf(v) === i);

  async function submit(action: PublisherDecisionAction) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/studio/publisher/${record.rvtr}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: reason.trim() || reasonOptions[0] || "Editorial review",
          reviewer: "operator",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "decision_failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rs-publisher-review">
      <header className="rs-publisher-review__head">
        <Link href="/ops/studio/publisher" className="rs-publisher-review__back">
          ← Publisher board
        </Link>
        <p className="rs-publisher-review__rvtr">{record.rvtr}</p>
        <h1 className="rs-publisher-review__title">
          {record.title} · {record.artist}
        </h1>
        {record.approvedClass ? (
          <p className="rs-publisher-review__approved">
            Approved as <strong>{record.approvedClass.replace("_", " ")}</strong>
            {record.publishedAt ? ` · ${new Date(record.publishedAt).toLocaleString()}` : ""}
          </p>
        ) : null}
        {evaluation?.fingerprints?.length ? (
          <p className="rs-publisher-review__fingerprints">
            {evaluation.fingerprints.join(" · ")}
          </p>
        ) : null}
      </header>

      {evaluation?.similarPackages && evaluation.similarPackages.length > 0 ? (
        <SimilarExperiencePanel
          matches={evaluation.similarPackages}
          uniquenessScore={evaluation.uniquenessScore ?? 100}
        />
      ) : null}

      {evaluation?.experienceScorecard ? (
        <div className="rs-publisher-review__experience-lab">
          <ExperienceScorecardPanel rvtr={record.rvtr} scorecard={evaluation.experienceScorecard} />
          {evaluation.experienceCritic ? (
            <ExperienceCriticPanel report={evaluation.experienceCritic} />
          ) : null}
        </div>
      ) : evaluation?.experienceCritic ? (
        <ExperienceCriticPanel report={evaluation.experienceCritic} />
      ) : null}

      <GoldenPackageButton
        rvtr={record.rvtr}
        isGolden={isGolden || Boolean(record.isGolden)}
        approved={Boolean(record.approvedClass)}
      />

      <VisualProducerReviewPanel plan={visualProduction} />

      <div className="rs-publisher-review__stack">
        <section className="rs-studio-panel rs-publisher-review__panel">
          <h2 className="rs-publisher-review__panel-title">Director output</h2>
          <dl className="rs-publisher-review__facts">
            <div>
              <dt>Scenes</dt>
              <dd>{director.experiencePlan.scenes.length}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>~{director.review.estimatedRuntimeSec}s</dd>
            </div>
            <div>
              <dt>Render readiness</dt>
              <dd>{director.review.renderReadinessLabel ?? director.review.readinessLabel}</dd>
            </div>
            <div>
              <dt>Visual coverage</dt>
              <dd>{director.review.imageCoveragePct ?? "—"}%</dd>
            </div>
            <div>
              <dt>Story coverage</dt>
              <dd>{director.review.storyCoveragePct ?? "—"}%</dd>
            </div>
          </dl>
          <ul className="rs-publisher-review__scene-list">
            {director.experiencePlan.scenes.slice(0, 8).map((scene) => (
              <li key={scene.sceneNumber}>
                <strong>{scene.sceneNumber}.</strong> {scene.headline || scene.title}
              </li>
            ))}
            {director.experiencePlan.scenes.length > 8 ? (
              <li>+ {director.experiencePlan.scenes.length - 8} more scenes</li>
            ) : null}
          </ul>
        </section>

        <section className="rs-studio-panel rs-studio-review-panel--attention rs-publisher-review__panel rs-publisher-review__panel--eval">
          <h2 className="rs-publisher-review__panel-title">Publisher evaluation</h2>
          {evaluation ? (
            <>
              <p className="rs-publisher-review__quality rs-studio-accent-value">
                {evaluation.qualityScore}%
                <span>{evaluation.publicationClass.replace("_", " ")}</span>
              </p>
              <p className="rs-publisher-review__why">{evaluation.why}</p>
              <div className="rs-publisher-review__dimensions">
                {evaluation.dimensions.map((dim) => (
                  <article key={dim.id} className="rs-publisher-dimension">
                    <div className="rs-publisher-dimension__head">
                      <h3>{dim.label}</h3>
                      <span>{dim.score}%</span>
                    </div>
                    <ul>
                      {dim.notes.map((note) => (
                        <li key={note.id}>{note.text}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
              {evaluation.assetChecks.length > 0 ? (
                <ul className="rs-publisher-review__assets">
                  {evaluation.assetChecks.map((check) => (
                    <li key={check.id} className={check.present ? "ok" : check.required ? "missing" : "optional"}>
                      {check.present ? "✓" : check.required ? "✗" : "○"} {check.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p>No evaluation yet.</p>
          )}

          <div className="rs-publisher-review__actions">
            <label className="rs-publisher-review__reason-label">
              Decision reason
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rs-publisher-review__reason-select"
              >
                <option value="">Select a reason…</option>
                {reasonOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <div className="rs-publisher-review__btn-row">
              {APPROVE_ACTIONS.map(({ action, label }) => (
                <button
                  key={action}
                  type="button"
                  disabled={busy || evaluation?.publicationClass === "blocked"}
                  className="rs-publisher-review__btn rs-publisher-review__btn--approve"
                  onClick={() => submit(action)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="rs-publisher-review__btn-row">
              {RETURN_ACTIONS.map(({ action, label }) => (
                <button
                  key={action}
                  type="button"
                  disabled={busy}
                  className="rs-publisher-review__btn rs-publisher-review__btn--return"
                  onClick={() => submit(action)}
                >
                  {label}
                </button>
              ))}
            </div>
            {error ? <p className="rs-publisher-review__error">{error}</p> : null}
          </div>

          {record.decisions.length > 0 ? (
            <div className="rs-publisher-review__history">
              <h3>Approval history</h3>
              <ul>
                {record.decisions
                  .slice()
                  .reverse()
                  .map((d, index) => (
                    <li key={d.id}>
                      <strong>{d.action.replace(/_/g, " ")}</strong> — {d.reason}
                      <span>{new Date(d.decidedAt).toLocaleString()}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="rs-studio-panel rs-publisher-review__panel rs-publisher-review__panel--preview">
          <h2 className="rs-publisher-review__panel-title">Public preview</h2>
          {preview ? (
            <TrainingRendererPreview payload={preview} />
          ) : (
            <p className="rs-publisher-review__preview-empty">
              Preview unavailable — Director render spec may be incomplete.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
