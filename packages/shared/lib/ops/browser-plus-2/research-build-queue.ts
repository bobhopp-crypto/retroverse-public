import "server-only";

import {
  getBrowserPlusExecutionJob,
  startBrowserPlusExecutionJob,
} from "@/lib/ops/browser-plus/execution-runner";
import type { BrowserPlusExecutionJob } from "@/lib/ops/browser-plus/execution-runner";

import type { Bp2CohortContext, Bp2ResearchQueueTier, Bp2ResearchQueueTiers, Bp2Row } from "./types";
import { isActiveVideoRow } from "./status";

const ACTIVE_STATUSES = new Set<BrowserPlusExecutionJob["status"]>(["queued", "running"]);

function researchTier(row: Bp2Row, cohorts: Bp2CohortContext): keyof Bp2ResearchQueueTiers {
  if (!row.rvtr) return "library";
  const key = row.rvtr.toUpperCase();
  if (cohorts.sundayRvtrs.has(key)) return "sundayMissing";
  if (cohorts.top100Rvtrs.has(key)) return "top100Missing";
  if (cohorts.top500Rvtrs.has(key)) return "top500Missing";
  return "library";
}

function tierRank(tier: keyof Bp2ResearchQueueTiers): number {
  switch (tier) {
    case "sundayMissing":
      return 0;
    case "top100Missing":
      return 1;
    case "top500Missing":
      return 2;
    default:
      return 3;
  }
}

function apiTierToQueueTier(tier: Bp2ResearchQueueTier): keyof Bp2ResearchQueueTiers {
  switch (tier) {
    case "sunday":
      return "sundayMissing";
    case "top100":
      return "top100Missing";
    case "top500":
      return "top500Missing";
    default:
      return "library";
  }
}

export function buildResearchQueueTiers(
  rows: Bp2Row[],
  cohorts: Bp2CohortContext,
): Bp2ResearchQueueTiers {
  const tiers: Bp2ResearchQueueTiers = {
    sundayMissing: 0,
    top100Missing: 0,
    top500Missing: 0,
    library: 0,
  };

  for (const row of rows) {
    if (!isActiveVideoRow(row) || !row.workQueues.needsResearch) continue;
    tiers[researchTier(row, cohorts)] += 1;
  }

  return tiers;
}

export function eligibleResearchBuildRows(
  rows: Bp2Row[],
  cohorts: Bp2CohortContext,
  options: { limit?: number; tier?: Bp2ResearchQueueTier; rvtr?: string | null } = {},
): Bp2Row[] {
  const limit = options.limit ?? 25;
  const queueTier = options.tier ? apiTierToQueueTier(options.tier) : null;

  let eligible = rows.filter(
    (row) => isActiveVideoRow(row) && row.workQueues.needsResearch && row.rvtr,
  );

  if (options.rvtr) {
    const key = options.rvtr.toUpperCase();
    eligible = eligible.filter((row) => row.rvtr?.toUpperCase() === key);
  } else if (queueTier) {
    eligible = eligible.filter((row) => researchTier(row, cohorts) === queueTier);
  }

  return eligible
    .sort((a, b) => {
      const tierDiff = tierRank(researchTier(a, cohorts)) - tierRank(researchTier(b, cohorts));
      if (tierDiff !== 0) return tierDiff;
      return (b.playCount ?? 0) - (a.playCount ?? 0);
    })
    .slice(0, limit);
}

export async function getActiveResearchBuildJob(): Promise<BrowserPlusExecutionJob | null> {
  const { listBrowserPlusExecutionJobs } = await import("./research-build-queue-store");
  const jobs = await listBrowserPlusExecutionJobs();
  return (
    jobs.find(
      (job) => job.actionId === "generate-package" && ACTIVE_STATUSES.has(job.status),
    ) ?? null
  );
}

export async function startResearchBuildQueue(
  rows: Bp2Row[],
  cohorts: Bp2CohortContext,
  options: { limit?: number; tier?: Bp2ResearchQueueTier; rvtr?: string | null } = {},
) {
  const eligible = eligibleResearchBuildRows(rows, cohorts, options);
  if (eligible.length === 0) {
    throw new Error("No songs need research in this queue.");
  }

  const active = await getActiveResearchBuildJob();
  if (active) {
    throw new Error("Research build queue is already running.");
  }

  return startBrowserPlusExecutionJob({
    actionId: "generate-package",
    rows: eligible.map((row) => ({
      rvtr: row.rvtr,
      title: row.title || row.fileName,
      artist: row.artist,
      filePath: row.filePath,
    })),
  });
}

export async function getResearchBuildQueueStatus(
  rows: Bp2Row[],
  cohorts: Bp2CohortContext,
) {
  const tiers = buildResearchQueueTiers(rows, cohorts);
  const activeJob = await getActiveResearchBuildJob();
  let job: BrowserPlusExecutionJob | null = activeJob;
  if (activeJob) {
    job = (await getBrowserPlusExecutionJob(activeJob.id)) ?? activeJob;
  }
  return {
    tiers,
    activeJob: job,
  };
}
