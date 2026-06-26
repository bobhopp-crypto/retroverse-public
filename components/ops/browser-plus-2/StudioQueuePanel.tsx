"use client";

import type {
  Bp2StudioJobPlanSnapshot,
  Bp2StudioQueueJob,
} from "@/lib/ops/browser-plus-2/types";

import {
  costLabel,
  formatDurationShort,
  formatElapsedShort,
  jobStatusLabel,
  queueDepartmentLabel,
  requirementLabels,
} from "@/components/ops/browser-plus-2/studio-ops-labels";

type Props = {
  jobs: Bp2StudioQueueJob[];
  paused: boolean;
  busy: boolean;
  jobPlans?: Bp2StudioJobPlanSnapshot[];
  onPause: () => void;
  onResume: () => void;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
};

function JobPlanDetails({ plan }: { plan: Bp2StudioJobPlanSnapshot }) {
  const reqTags = requirementLabels(plan);

  return (
    <div className="bp2__studio-queue-plan">
      <span className="bp2__studio-queue-plan-est">
        About {formatDurationShort(plan.plannedTimeMs)} · {costLabel(plan.estimatedCost)} load
      </span>
      {plan.preferredAiBackend ? (
        <span className="bp2__studio-queue-plan-ai">AI engine: {plan.preferredAiBackend}</span>
      ) : null}
      {reqTags.length > 0 ? (
        <span className="bp2__studio-queue-plan-req">Needs: {reqTags.join(", ")}</span>
      ) : null}
      {plan.runnable === false && plan.blockers.length > 0 ? (
        <div className="bp2__studio-queue-waiting">
          <span className="bp2__studio-queue-waiting-label">Waiting on</span>
          <ul className="bp2__studio-queue-blockers">
            {plan.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {plan.runnable === true ? (
        <span className="bp2__studio-queue-ready">Ready to run</span>
      ) : null}
    </div>
  );
}

function statusClass(status: Bp2StudioQueueJob["status"]): string {
  switch (status) {
    case "running":
      return "bp2__studio-queue-status bp2__studio-queue-status--running";
    case "paused":
      return "bp2__studio-queue-status bp2__studio-queue-status--paused";
    case "failed":
      return "bp2__studio-queue-status bp2__studio-queue-status--failed";
    case "complete":
      return "bp2__studio-queue-status bp2__studio-queue-status--done";
    default:
      return "bp2__studio-queue-status";
  }
}

export function StudioQueuePanel({
  jobs,
  paused,
  busy,
  jobPlans = [],
  onPause,
  onResume,
  onCancel,
  onRetry,
}: Props) {
  const planByJobId = new Map(jobPlans.map((plan) => [plan.jobId, plan]));
  const active = jobs.filter((j) => j.status === "queued" || j.status === "running" || j.status === "paused");
  const recent = jobs.filter((j) => j.status === "complete" || j.status === "failed").slice(-5);

  const totalRemainingMs = active.reduce((sum, job) => {
    if (job.estimatedRemainingMs !== null) return sum + job.estimatedRemainingMs;
    const plan = planByJobId.get(job.id);
    return sum + (plan?.plannedTimeMs ?? 0);
  }, 0);

  return (
    <section className="bp2__studio-queue" aria-label="Production queue">
      <div className="bp2__studio-queue-head">
        <div>
          <h2 className="bp2__studio-queue-title">Production Queue</h2>
          {active.length > 0 ? (
            <p className="bp2__studio-queue-sub">
              {active.length} job{active.length === 1 ? "" : "s"}
              {totalRemainingMs > 0 ? ` · about ${formatDurationShort(totalRemainingMs)} left` : ""}
              {paused ? " · paused" : ""}
            </p>
          ) : (
            <p className="bp2__studio-queue-sub">Nothing in the queue</p>
          )}
        </div>
        <div className="bp2__studio-queue-controls">
          {paused ? (
            <button type="button" className="bp2__action bp2__action--ops bp2__action--ghost" disabled={busy} onClick={onResume}>
              Resume Queue
            </button>
          ) : (
            <button type="button" className="bp2__action bp2__action--ops bp2__action--ghost" disabled={busy} onClick={onPause}>
              Pause Queue
            </button>
          )}
        </div>
      </div>

      {active.length === 0 && recent.length === 0 ? (
        <p className="bp2__studio-queue-empty">No jobs queued — departments are standing by.</p>
      ) : null}

      <ul className="bp2__studio-queue-list">
        {active.map((job) => {
          const plan = planByJobId.get(job.id);
          return (
            <li key={job.id} className={`bp2__studio-queue-item bp2__studio-queue-item--${job.status}`}>
              <div className="bp2__studio-queue-item-body">
                <div className="bp2__studio-queue-item-main">
                  <span className="bp2__studio-queue-dept">{queueDepartmentLabel(job.department)}</span>
                  <span className={statusClass(job.status)}>{jobStatusLabel(job.status)}</span>
                </div>
                <p className="bp2__studio-queue-step">{job.step}</p>
                <div className="bp2__studio-queue-item-meta">
                  <span>
                    Song {job.currentIndex + 1} of {job.total}
                  </span>
                  <span>{formatElapsedShort(job.elapsedMs)} elapsed</span>
                  {job.estimatedRemainingMs !== null ? (
                    <span className="bp2__studio-queue-remaining">
                      ~{formatDurationShort(job.estimatedRemainingMs)} left
                    </span>
                  ) : null}
                </div>
                {plan ? <JobPlanDetails plan={plan} /> : null}
              </div>
              <div className="bp2__studio-queue-item-actions">
                <button
                  type="button"
                  className="bp2__action bp2__action--ops"
                  disabled={busy}
                  onClick={() => onCancel(job.id)}
                >
                  Cancel
                </button>
              </div>
            </li>
          );
        })}
        {recent.map((job) => (
          <li
            key={job.id}
            className={`bp2__studio-queue-item bp2__studio-queue-item--${job.status} bp2__studio-queue-item--recent`}
          >
            <div className="bp2__studio-queue-item-body">
              <div className="bp2__studio-queue-item-main">
                <span className="bp2__studio-queue-dept">{queueDepartmentLabel(job.department)}</span>
                <span className={statusClass(job.status)}>{jobStatusLabel(job.status)}</span>
              </div>
              <p className="bp2__studio-queue-step">{job.step}</p>
            </div>
            {job.status === "failed" ? (
              <button type="button" className="bp2__action bp2__action--ops" disabled={busy} onClick={() => onRetry(job.id)}>
                Try Again
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
