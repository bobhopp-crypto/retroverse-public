/** Operator-facing labels for Song → Research → Experience (display layer only). */

import {
  computeWorkQueueResearchScore,
  workQueueResearchScoreLevel,
} from "@/lib/ops/browser-plus-2/work-queues";

const EXPERIENCE_RENDERABLE = new Set(["published", "review"]);

export function isExperienceRenderable(status: string | null | undefined): boolean {
  return Boolean(status && EXPERIENCE_RENDERABLE.has(status));
}

export function identityStatusLabel(status: string): string {
  if (status === "Processed Legacy") return "Legacy";
  return status;
}

export function researchStatusLabel(packageStatus: string): string {
  const labels: Record<string, string> = {
    "Missing Package": "No research",
    "Missing RVTR": "Unidentified",
    "Missing Cover": "Missing cover",
    "Needs Review": "Needs review",
    "Cards Ready": "Story ready",
    "Ready To Publish": "Approved",
    Complete: "Research complete",
    Published: "Published",
    Draft: "Draft",
    Processing: "Processing",
  };
  return labels[packageStatus] ?? packageStatus;
}

export function experienceStatusLabel(
  rvtr: string | null,
  experienceReady: boolean,
  pkg: { status: string } | null,
): string {
  if (!rvtr) return "—";
  if (pkg) {
    return isExperienceRenderable(pkg.status) ? "Experience ready" : "Not experience-ready";
  }
  return experienceReady ? "Experience ready" : "Not experience-ready";
}

export type ResearchScoreInput = {
  rvtr: string | null;
  hasCover: boolean;
  hasResearch: boolean;
  storyCount: number;
  factCount: number;
  sourceCount: number;
  chartHistory: number;
  artistFacts: number;
  albumContext: boolean;
  relatedSongs: number;
  timelineEvents: number;
  artifactReadyCount: number;
};

export function computeResearchScore(input: ResearchScoreInput): number {
  return computeWorkQueueResearchScore({
    rvtr: input.rvtr,
    hasUsableCover: input.hasCover,
    factCount: input.factCount,
    storyCount: input.storyCount,
    timelineEvents: input.timelineEvents,
    relatedSongs: input.relatedSongs,
    artistFacts: input.artistFacts,
  });
}

export function researchScoreLevel(score: number): string {
  return workQueueResearchScoreLevel(score);
}

export function computeExperienceScore(
  rvtr: string | null,
  hasCover: boolean,
  experienceReady: boolean,
  pkg: { status: string; metadata?: { coverUrl?: string | null } } | null,
  storyCount: number,
  factCount: number,
): number {
  if (!rvtr) return 0;

  let score = 0;
  const cover = hasCover || Boolean(pkg?.metadata?.coverUrl);
  if (cover) score += 25;
  if (storyCount > 0) score += 25;
  if (factCount > 0) score += 20;

  const renderable = pkg ? isExperienceRenderable(pkg.status) : experienceReady;
  if (renderable) score += 30;

  return Math.min(100, score);
}
