import type { Bp2NextAction, Bp2PatronPriority, Bp2ResearchQueueTier, Bp2Row } from "./types";

const PRIORITY_ORDER: Bp2PatronPriority[] = ["Sunday Nights", "Top 100", "Top 500", "Library"];

export function pickReviewNextRow(rows: Bp2Row[]): Bp2Row | null {
  const reviewRows = rows.filter((row) => row.workQueues.needsReview && row.rvtr);
  for (const priority of PRIORITY_ORDER) {
    const match = reviewRows
      .filter((row) => row.patronPriority === priority)
      .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))[0];
    if (match) return match;
  }
  return null;
}

export function researchPackageUrl(rvtr: string): string {
  return `/ops/intelligence/package/${rvtr}`;
}

export function songExperienceUrl(rvtr: string): string {
  return `/retroverse-2/song/${rvtr}`;
}

export function matchingWorkflowUrl(): string {
  return "/ops/browser-plus";
}

export function coverToolsUrl(rvtr?: string | null): string {
  if (rvtr) return `/ops/review/covers?rvtr=${encodeURIComponent(rvtr)}`;
  return "/ops/review/covers";
}

export function collectorUrl(rvtr: string): string {
  return `/ops/studio/collector/${rvtr.trim().toUpperCase()}`;
}

export function editorUrl(rvtr: string): string {
  return `/ops/studio/editor/${rvtr.trim().toUpperCase()}`;
}

export function directorUrl(rvtr: string): string {
  return `/ops/studio/director?rvtr=${encodeURIComponent(rvtr.trim().toUpperCase())}`;
}

export function studioHomeUrl(): string {
  return "/ops/studio";
}

export function experiencePlanUrl(rvtr: string): string {
  return `/ops/studio/director?rvtr=${encodeURIComponent(rvtr.trim().toUpperCase())}&view=plan`;
}

export function packageFolderUrl(rvtr: string): string {
  return `/ops/intelligence/package/${rvtr.trim().toUpperCase()}`;
}

export function nextActionLabel(action: Bp2NextAction): string {
  switch (action) {
    case "Assign RVTR":
      return "Open Matching";
    case "Build Research":
      return "Queue Research";
    case "Review Package":
      return "Open Song Research";
    case "Acquire Cover":
      return "Open Cover Tools";
    case "Fix Renderability":
      return "Open Song Research";
    case "Experience Ready":
      return "Open Song";
    default:
      return "Take Action";
  }
}

export function nextActionIsDisabled(action: Bp2NextAction): boolean {
  return action === "Experience Ready";
}

export function tierButtonLabel(tier: Bp2ResearchQueueTier): string {
  switch (tier) {
    case "sunday":
      return "Process Next Sunday Song";
    case "top100":
      return "Process Next Top 100 Song";
    case "top500":
      return "Process Next Top 500 Song";
    default:
      return "Process Next Library Song";
  }
}

export function tierToApiTier(tier: Bp2ResearchQueueTier): Bp2ResearchQueueTier {
  return tier;
}
