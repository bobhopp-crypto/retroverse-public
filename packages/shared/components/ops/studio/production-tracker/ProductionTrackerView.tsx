import Link from "next/link";

import { formatTimestamp } from "@/lib/ops/studio/production-tracker/format-elapsed";
import type { ProductionTrackerSnapshot, ProductionTrackerStep } from "@/lib/ops/studio/production-tracker/types";

type Props = {
  snapshot: ProductionTrackerSnapshot;
};

function stepClassName(step: ProductionTrackerStep): string {
  return [
    "rs-track__step",
    `rs-track__step--${step.status}`,
  ].join(" ");
}

export function ProductionTrackerView({ snapshot }: Props) {
  const currentStep = snapshot.steps.find((s) => s.id === snapshot.currentDepartment);

  return (
    <div className="rs-track">
      <header className="rs-track__hero">
        <Link href="/ops/studio" className="rs-track__back">
          ← Mission Control
        </Link>
        <p className="rs-track__kicker">Follow This Song</p>
        <div className="rs-track__song">
          {snapshot.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={snapshot.coverUrl} alt="" className="rs-track__art" />
          ) : (
            <div className="rs-track__art rs-track__art--fallback" aria-hidden>
              {snapshot.title.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="rs-track__title">{snapshot.title}</h1>
            <p className="rs-track__artist">{snapshot.artist}</p>
            <p className="rs-track__rvtr">{snapshot.rvtr}</p>
          </div>
        </div>
      </header>

      <section className="rs-track__status" aria-label="Production status">
        <dl className="rs-track__status-grid">
          <div>
            <dt>Current department</dt>
            <dd>{currentStep?.name ?? (snapshot.pipelineStage === "published" ? "Complete" : "Queued")}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{currentStep?.statusLabel ?? snapshot.pipelineReason}</dd>
          </div>
          <div>
            <dt>Started</dt>
            <dd>{formatTimestamp(snapshot.startedAt)}</dd>
          </div>
          <div>
            <dt>Elapsed</dt>
            <dd>{snapshot.elapsedLabel}</dd>
          </div>
          <div>
            <dt>Previous completed</dt>
            <dd>
              {snapshot.previousDepartments.length > 0
                ? snapshot.previousDepartments.map((id) => id.charAt(0).toUpperCase() + id.slice(1)).join(", ")
                : "None yet"}
            </dd>
          </div>
          <div>
            <dt>Next department</dt>
            <dd>
              {snapshot.nextDepartment
                ? snapshot.nextDepartment.charAt(0).toUpperCase() + snapshot.nextDepartment.slice(1)
                : snapshot.pipelineStage === "published"
                  ? "Published"
                  : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <ol className="rs-track__pipeline" aria-label="Studio pipeline for this song">
        {snapshot.steps.map((step, index) => (
          <li key={step.id} className={stepClassName(step)}>
            {index > 0 ? <span className="rs-track__arrow" aria-hidden>↓</span> : null}
            <article className="rs-track__card">
              <header className="rs-track__card-head">
                <div>
                  <h2 className="rs-track__dept">{step.name}</h2>
                  <p className="rs-track__summary">{step.summary}</p>
                </div>
                <span className="rs-track__badge">{step.statusLabel}</span>
              </header>

              {(step.startedAt || step.completedAt) && (
                <p className="rs-track__times">
                  {step.startedAt ? `Started ${formatTimestamp(step.startedAt)}` : null}
                  {step.startedAt && step.completedAt ? " · " : null}
                  {step.completedAt ? `Finished ${formatTimestamp(step.completedAt)}` : null}
                </p>
              )}

              <ul className="rs-track__outputs">
                {step.outputs.map((item) => (
                  <li
                    key={item.label}
                    className={item.done ? "rs-track__output rs-track__output--done" : "rs-track__output"}
                  >
                    <span className="rs-track__output-label">{item.label}</span>
                    <span className="rs-track__output-value">{item.value}</span>
                  </li>
                ))}
              </ul>

              {step.openEnabled ? (
                <Link href={step.openHref} className="rs-track__open">
                  {step.openLabel}
                </Link>
              ) : (
                <p className="rs-track__open rs-track__open--disabled" aria-disabled="true">
                  {step.openHint}
                </p>
              )}
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
