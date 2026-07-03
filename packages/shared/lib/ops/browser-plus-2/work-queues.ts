import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";

import {
  computeNextAction,
  hasResearchPackage,
  hasUsableCover,
  isPatronExperienceReady,
  type Bp2ReadinessInput,
} from "./readiness";
import type { Bp2CohortContext, Bp2PackageHint, Bp2Row, Bp2SummaryCounts, Bp2WorkQueues } from "./types";
import { isActiveVideoRow } from "./status";

export type Bp2WorkQueueId =
  | "needs-identity"
  | "needs-research"
  | "needs-review"
  | "no-usable-cover"
  | "experience-ready";

export const BP2_WORK_QUEUE_FILTERS: Array<{
  id: Bp2WorkQueueId | "all-videos" | "top-played" | "sunday-nights-missing" | "top-100-missing" | "top-500-missing";
  label: string;
}> = [
  { id: "sunday-nights-missing", label: "Sunday Nights Missing" },
  { id: "top-100-missing", label: "Top 100 Missing" },
  { id: "top-500-missing", label: "Top 500 Missing" },
  { id: "needs-identity", label: "Needs Identity" },
  { id: "needs-research", label: "Needs Research" },
  { id: "needs-review", label: "Needs Review" },
  { id: "no-usable-cover", label: "No Usable Cover" },
  { id: "experience-ready", label: "Experience Ready" },
  { id: "all-videos", label: "All Videos" },
  { id: "top-played", label: "Top Played" },
];

export function computeWorkQueues(input: Bp2ReadinessInput): Bp2WorkQueues {
  const { row, hint } = input;
  const hasResearch = hasResearchPackage(row);
  const researchStatus = hint?.status ?? null;
  const usableCover = hasUsableCover(input);

  const needsIdentity = !row.rvtr;
  const needsResearch = Boolean(row.rvtr && !hasResearch);
  const needsReview = Boolean(row.rvtr && researchStatus === "review");
  const noUsableCover = Boolean(row.rvtr && !usableCover);
  const experienceReady = isPatronExperienceReady(input);

  return {
    needsIdentity,
    needsResearch,
    needsReview,
    noUsableCover,
    experienceReady,
  };
}

export function activeWorkQueueLabels(workQueues: Bp2WorkQueues): string[] {
  const labels: string[] = [];
  if (workQueues.needsIdentity) labels.push("Needs Identity");
  if (workQueues.needsResearch) labels.push("Needs Research");
  if (workQueues.needsReview) labels.push("Needs Review");
  if (workQueues.noUsableCover) labels.push("No Usable Cover");
  if (workQueues.experienceReady) labels.push("Experience Ready");
  return labels;
}

export function workQueueBadgeClass(label: string): string {
  switch (label) {
    case "Needs Identity":
      return "bp2-badge bp2-badge--identity";
    case "Needs Research":
      return "bp2-badge bp2-badge--research";
    case "Needs Review":
      return "bp2-badge bp2-badge--review";
    case "No Usable Cover":
      return "bp2-badge bp2-badge--cover";
    case "Experience Ready":
      return "bp2-badge bp2-badge--ready";
    default:
      return "bp2-badge";
  }
}

export function matchesWorkQueueFilter(
  row: Bp2Row,
  filter:
    | Bp2WorkQueueId
    | "all-videos"
    | "top-played"
    | "missing-metadata"
    | "sunday-nights-missing"
    | "top-100-missing"
    | "top-500-missing",
): boolean {
  if (!isActiveVideoRow(row) && filter !== "all-videos") return false;

  switch (filter) {
    case "all-videos":
      return isActiveVideoRow(row);
    case "needs-identity":
      return row.workQueues.needsIdentity;
    case "needs-research":
      return row.workQueues.needsResearch;
    case "needs-review":
      return row.workQueues.needsReview;
    case "no-usable-cover":
      return row.workQueues.noUsableCover;
    case "experience-ready":
      return row.workQueues.experienceReady;
    case "top-played":
      return isActiveVideoRow(row) && (row.playCount ?? 0) > 0;
    case "missing-metadata":
      return isActiveVideoRow(row) && row.missingXmlMetadata;
    case "sunday-nights-missing":
      return row.inSundayCohort && !row.workQueues.experienceReady;
    case "top-100-missing":
      return row.inTop100Cohort && !row.workQueues.experienceReady;
    case "top-500-missing":
      return row.inTop500Cohort && !row.workQueues.experienceReady;
    default:
      return true;
  }
}

export function sortForWorkQueueFilter(
  rows: Bp2Row[],
  filter:
    | Bp2WorkQueueId
    | "all-videos"
    | "top-played"
    | "missing-metadata"
    | "sunday-nights-missing"
    | "top-100-missing"
    | "top-500-missing",
): Bp2Row[] {
  const copy = [...rows];
  if (
    filter === "top-played" ||
    filter === "top-100-missing" ||
    filter === "top-500-missing" ||
    filter === "sunday-nights-missing"
  ) {
    return copy.sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));
  }
  if (filter === "missing-metadata") {
    return copy.sort((a, b) => a.fileName.localeCompare(b.fileName));
  }
  return copy.sort((a, b) => {
    const artist = a.artist.localeCompare(b.artist);
    if (artist !== 0) return artist;
    return a.title.localeCompare(b.title);
  });
}

export function workQueueFilterCounts(
  rows: Bp2Row[],
): Record<
  Bp2WorkQueueId | "all-videos" | "top-played" | "missing-metadata" | "sunday-nights-missing" | "top-100-missing" | "top-500-missing",
  number
> {
  const items = [
    ...BP2_WORK_QUEUE_FILTERS,
    { id: "missing-metadata" as const, label: "Missing Metadata" },
  ];
  const counts = {} as Record<(typeof items)[number]["id"], number>;
  for (const item of items) {
    counts[item.id] = rows.filter((row) => matchesWorkQueueFilter(row, item.id)).length;
  }
  return counts;
}

export function buildWorkQueueSummary(rows: Bp2Row[]): Bp2SummaryCounts {
  const videos = rows.filter(isActiveVideoRow);
  return {
    videos: videos.length,
    needsIdentity: videos.filter((row) => row.workQueues.needsIdentity).length,
    needsResearch: videos.filter((row) => row.workQueues.needsResearch).length,
    needsReview: videos.filter((row) => row.workQueues.needsReview).length,
    noUsableCover: videos.filter((row) => row.workQueues.noUsableCover).length,
    experienceReady: videos.filter((row) => row.workQueues.experienceReady).length,
    missingMetadata: videos.filter((row) => row.missingXmlMetadata).length,
    recoverableMetadata: videos.filter(
      (row) => row.missingXmlMetadata && row.hasFilenameRecovery && row.recoveryConfidence === "high",
    ).length,
  };
}

export type Bp2ResearchScoreInput = {
  rvtr: string | null;
  hasUsableCover: boolean;
  factCount: number;
  storyCount: number;
  timelineEvents: number;
  relatedSongs: number;
  artistFacts: number;
};

export function computeWorkQueueResearchScore(input: Bp2ResearchScoreInput): number {
  let score = 0;
  if (input.rvtr) score += 20;
  if (input.hasUsableCover) score += 20;
  if (input.factCount > 0) score += 20;
  if (input.storyCount > 0) score += 20;
  if (input.timelineEvents >= 2 || input.relatedSongs > 0 || input.artistFacts > 0) score += 20;
  return score;
}

export function workQueueResearchScoreLevel(score: number): string {
  if (score <= 24) return "Minimal";
  if (score <= 49) return "Basic";
  if (score <= 74) return "Good";
  if (score <= 89) return "Rich";
  return "Complete";
}

export { computeNextAction };
