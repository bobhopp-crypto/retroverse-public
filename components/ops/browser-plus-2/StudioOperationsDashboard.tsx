"use client";

import type {
  Bp2ProductionHealth,
  Bp2StudioAiBackendSnapshot,
  Bp2StudioOperations,
  Bp2StudioQueueJob,
  Bp2StudioWorkerSnapshot,
  Bp2WorkerAvailability,
} from "@/lib/ops/browser-plus-2/types";

import {
  aiEngineStatusLabel,
  availabilityLabel,
  costLabel,
  departmentDisplayName,
  formatDurationShort,
  queueDepartmentLabel,
  requirementLabels,
} from "@/components/ops/browser-plus-2/studio-ops-labels";
import { GuideAnnotatedSection, GuideTooltip } from "@/components/ops/studio/operator-guide";

type Props = {
  operations: Bp2StudioOperations;
  jobs?: Bp2StudioQueueJob[];
  queuePaused?: boolean;
  productionHealth?: Bp2ProductionHealth;
};

type OverallState = "clear" | "live" | "attention";

function availabilityClass(state: Bp2WorkerAvailability): string {
  switch (state) {
    case "busy":
      return "bp2__ops-badge bp2__ops-badge--busy";
    case "unavailable":
      return "bp2__ops-badge bp2__ops-badge--off";
    default:
      return "bp2__ops-badge bp2__ops-badge--idle";
  }
}

function overallHeadline(state: OverallState, queuePaused: boolean): string {
  if (queuePaused) return "Queue Paused";
  switch (state) {
    case "attention":
      return "Needs Attention";
    case "live":
      return "On Air";
    default:
      return "All Clear";
  }
}

function overallDetail(
  state: OverallState,
  workingCount: number,
  attentionCount: number,
  queuePaused: boolean,
): string {
  if (queuePaused) return "Production queue is paused — nothing new will start.";
  switch (state) {
    case "attention":
      return attentionCount === 1
        ? "1 item needs your attention before work can continue."
        : `${attentionCount} items need your attention before work can continue.`;
    case "live":
      return workingCount === 1
        ? "1 department is working right now."
        : `${workingCount} departments are working right now.`;
    default:
      return "All departments are ready. No active production jobs.";
  }
}

function DepartmentCard({ worker }: { worker: Bp2StudioWorkerSnapshot }) {
  const name = departmentDisplayName(worker.workerId);
  const isWorking = worker.availability === "busy";
  const tags = requirementLabels(worker);

  return (
    <article className={`bp2__ops-dept-card ${isWorking ? "bp2__ops-dept-card--live" : ""}`}>
      <div className="bp2__ops-dept-head">
        <strong className="bp2__ops-dept-name">{name}</strong>
        <span className={availabilityClass(worker.availability)}>
          {availabilityLabel(worker.availability)}
        </span>
      </div>

      {isWorking && worker.currentAction ? (
        <p className="bp2__ops-dept-live">
          {worker.currentAction}
          {worker.currentRvtr ? ` · ${worker.currentRvtr}` : ""}
        </p>
      ) : (
        <p className="bp2__ops-dept-idle">{worker.summary}</p>
      )}

      <details className="bp2__ops-details">
        <summary>Details</summary>
        <dl className="bp2__ops-dept-meta">
          <div>
            <dt>Typical run</dt>
            <dd>{formatDurationShort(worker.estimatedExecutionTimeMs)}</dd>
          </div>
          <div>
            <dt>Load</dt>
            <dd>{costLabel(worker.estimatedExecutionCost)}</dd>
          </div>
          {worker.preferredAiBackend ? (
            <div>
              <dt>AI engine</dt>
              <dd>
                {worker.preferredAiBackend}
                {worker.preferredModel ? ` · ${worker.preferredModel}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>
        {tags.length > 0 ? (
          <ul className="bp2__ops-tag-list">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
      </details>
    </article>
  );
}

function AiEngineCard({ backend }: { backend: Bp2StudioAiBackendSnapshot }) {
  return (
    <div
      className={`bp2__ops-engine-card ${backend.available ? "bp2__ops-engine-card--up" : "bp2__ops-engine-card--down"}`}
    >
      <strong className="bp2__ops-engine-name">{backend.displayName}</strong>
      <span
        className={`bp2__ops-engine-status ${backend.available ? "bp2__ops-engine-status--up" : "bp2__ops-engine-status--down"}`}
      >
        {aiEngineStatusLabel(backend.available)}
      </span>
      {backend.detail ? <span className="bp2__ops-engine-detail">{backend.detail}</span> : null}
    </div>
  );
}

export function StudioOperationsDashboard({
  operations,
  jobs = [],
  queuePaused = false,
  productionHealth,
}: Props) {
  const { workers, aiBackends, jobPlans } = operations;

  const readyCount = workers.filter((w) => w.availability === "idle").length;
  const workingCount = workers.filter((w) => w.availability === "busy").length;
  const aiDown = aiBackends.filter((b) => !b.available);

  const activeJobs = jobs.filter((j) => j.status === "queued" || j.status === "running" || j.status === "paused");
  const runningJobs = jobs.filter((j) => j.status === "running");

  const planByJobId = new Map(jobPlans.map((plan) => [plan.jobId, plan]));
  const blockedPlans = jobPlans.filter((plan) => plan.runnable === false && plan.blockers.length > 0);

  const attentionItems: string[] = [];
  if (queuePaused && activeJobs.length > 0) {
    attentionItems.push("Production queue is paused with jobs still waiting.");
  }
  for (const backend of aiDown) {
    attentionItems.push(`${backend.displayName} is offline.`);
  }
  for (const plan of blockedPlans) {
    const dept = queueDepartmentLabel(plan.department);
    for (const blocker of plan.blockers) {
      attentionItems.push(`${dept}: ${blocker}`);
    }
  }
  for (const worker of workers.filter((w) => w.availability === "unavailable")) {
    attentionItems.push(`${departmentDisplayName(worker.workerId)} is offline.`);
  }

  const totalRemainingMs = activeJobs.reduce((sum, job) => {
    if (job.estimatedRemainingMs !== null) return sum + job.estimatedRemainingMs;
    const plan = planByJobId.get(job.id);
    return sum + (plan?.plannedTimeMs ?? 0);
  }, 0);

  const liveWorkers = workers.filter((w) => w.availability === "busy");

  let overallState: OverallState = "clear";
  if (attentionItems.length > 0 || queuePaused) {
    overallState = "attention";
  } else if (workingCount > 0 || runningJobs.length > 0) {
    overallState = "live";
  }

  return (
    <GuideAnnotatedSection cardId="missionControl">
      <section className="bp2__ops-mission" aria-label="Studio mission control">
        <header className="bp2__ops-mission-hero" data-guide="mission-hero">
        <div className="bp2__ops-mission-status">
          <span className={`bp2__ops-mission-lamp bp2__ops-mission-lamp--${overallState}`} aria-hidden />
          <div>
            <h2 className="bp2__ops-mission-headline">{overallHeadline(overallState, queuePaused)}</h2>
            <p className="bp2__ops-mission-detail">
              {overallDetail(overallState, workingCount, attentionItems.length, queuePaused)}
            </p>
          </div>
        </div>
        {activeJobs.length > 0 ? (
          <div className="bp2__ops-mission-eta">
            <span className="bp2__ops-mission-eta-label">Est. time left</span>
            <strong className="bp2__ops-mission-eta-value">
              {totalRemainingMs > 0 ? formatDurationShort(totalRemainingMs) : "Calculating…"}
            </strong>
          </div>
        ) : null}
      </header>

      <div className="bp2__ops-mission-stats" aria-label="Work status" data-guide="mission-stats">
        <div className="bp2__ops-stat bp2__ops-stat--queue">
          <strong>{productionHealth?.queueWaiting ?? activeJobs.filter((j) => j.status === "queued").length}</strong>
          <GuideTooltip metricId="queueWaiting">
            <span>Waiting</span>
          </GuideTooltip>
        </div>
        <div className="bp2__ops-stat bp2__ops-stat--live">
          <strong>{productionHealth?.queueRunning ?? runningJobs.length}</strong>
          <GuideTooltip metricId="queueRunning">
            <span>Running</span>
          </GuideTooltip>
        </div>
        <div className="bp2__ops-stat">
          <strong>{productionHealth?.queueCompleted24h ?? jobs.filter((j) => j.status === "complete").length}</strong>
          <span>Completed (24h)</span>
        </div>
        <div className="bp2__ops-stat bp2__ops-stat--warn">
          <strong>{productionHealth?.queueBlocked ?? blockedPlans.length}</strong>
          <GuideTooltip metricId="queueBlocked">
            <span>Blocked</span>
          </GuideTooltip>
        </div>
        <div className="bp2__ops-stat bp2__ops-stat--fail">
          <strong>{productionHealth?.queueFailed24h ?? jobs.filter((j) => j.status === "failed").length}</strong>
          <GuideTooltip metricId="queueFailed">
            <span>Failed (24h)</span>
          </GuideTooltip>
        </div>
      </div>

      {liveWorkers.length > 0 ? (
        <div className="bp2__ops-live-now">
          <h3 className="bp2__ops-block-title">Live Now</h3>
          <ul className="bp2__ops-live-list">
            {liveWorkers.map((worker) => (
              <li key={worker.instanceId}>
                <strong>{departmentDisplayName(worker.workerId)}</strong>
                <span>{worker.currentAction ?? "Working"}</span>
                {worker.currentRvtr ? <em>{worker.currentRvtr}</em> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {attentionItems.length > 0 ? (
        <div className="bp2__ops-attention">
          <h3 className="bp2__ops-block-title">Needs Attention</h3>
          <ul className="bp2__ops-attention-list">
            {attentionItems.map((item) => (
              <li key={item} className="bp2__ops-attention-item">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(workingCount > 0 || activeJobs.length > 0 || workers.some((w) => w.availability === "unavailable")) ? (
        <div className="bp2__ops-departments" aria-label="Departments">
          <h3 className="bp2__ops-block-title">Departments</h3>
          <div className="bp2__ops-dept-grid">
            {workers
              .filter((w) => w.availability !== "idle" || attentionItems.length > 0)
              .map((worker) => (
                <DepartmentCard key={worker.instanceId} worker={worker} />
              ))}
          </div>
        </div>
      ) : null}

      {aiDown.length > 0 ? (
        <div className="bp2__ops-engines" aria-label="AI engines offline">
          <h3 className="bp2__ops-block-title">AI Engines Offline</h3>
          <div className="bp2__ops-engine-grid">
            {aiDown.map((backend) => (
              <AiEngineCard key={backend.id} backend={backend} />
            ))}
          </div>
        </div>
      ) : null}
      </section>
    </GuideAnnotatedSection>
  );
}
