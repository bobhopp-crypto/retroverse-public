import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";

import { isSongExperienceRenderable } from "@/lib/ops/intelligence/song-experience-renderability-core";
import { completionPct } from "@/lib/studio/metrics";

import type { Bp2NextAction, Bp2PackageHint, Bp2PathToReady, Bp2PatronPriority, Bp2ReadinessBlockers } from "./types";

export type Bp2ReadinessInput = {
  row: BrowserPlusRow;
  hint: Bp2PackageHint | null;
  canonicalCoverUrl: string | null;
  storyCount?: number;
};

/** Package JSON file exists. */
export function hasResearchPackage(row: BrowserPlusRow): boolean {
  return row.packageStatus !== "Missing Package";
}

/** Package cover URL in research JSON. */
export function hasPackageCover(row: BrowserPlusRow, hint: Bp2PackageHint | null): boolean {
  return Boolean(row.hasRetroverseCover || hint?.hasCover);
}

/** VDJ embedded cover or sidecar thumbnail. */
export function hasVdjCover(row: BrowserPlusRow): boolean {
  return Boolean(
    row.hasCover ||
      row.thumbnailStatus === "Present" ||
      row.coverStatus === "Cover Present",
  );
}

/**
 * Patron-aligned usable cover (audited Phase 5):
 * canonical Cover Library OR package cover OR VDJ thumbnail/embedded OR album artwork via canonical.
 */
export function hasUsableCover(input: Bp2ReadinessInput): boolean {
  return Boolean(
    hasPackageCover(input.row, input.hint) ||
      hasVdjCover(input.row) ||
      input.canonicalCoverUrl,
  );
}

export function hasStory(hint: Bp2PackageHint | null, storyCount = 0): boolean {
  return (hint?.storyCount ?? storyCount) > 0;
}

export function isRenderable(hint: Bp2PackageHint | null, researchStatus: string | null): boolean {
  if (hint?.experienceReady) return true;
  return isSongExperienceRenderable(researchStatus ?? hint?.status ?? null);
}

/**
 * Patron-aligned Experience Ready (Browser Plus 3.3):
 * RVTR + research package + usable cover + story + renderable status (review/published).
 */
export function isPatronExperienceReady(input: Bp2ReadinessInput): boolean {
  const { row, hint } = input;
  if (!row.rvtr) return false;
  if (!hasResearchPackage(row)) return false;
  if (!hasUsableCover(input)) return false;
  if (!hasStory(hint, input.storyCount ?? 0)) return false;
  return isRenderable(hint, hint?.status ?? null);
}

export function computePatronPriority(
  rvtr: string | null,
  cohorts: { sundayRvtrs: Set<string>; top100Rvtrs: Set<string>; top500Rvtrs: Set<string> },
): Bp2PatronPriority {
  if (!rvtr) return "Library";
  const key = rvtr.toUpperCase();
  if (cohorts.sundayRvtrs.has(key)) return "Sunday Nights";
  if (cohorts.top100Rvtrs.has(key)) return "Top 100";
  if (cohorts.top500Rvtrs.has(key)) return "Top 500";
  return "Library";
}

/** Single recommended operator action — no technical jargon. */
export function computeNextAction(
  input: Bp2ReadinessInput & { researchStatus: string | null },
): Bp2NextAction {
  const { row, hint } = input;

  if (!row.rvtr) return "Assign RVTR";
  if (!hasResearchPackage(row)) return "Build Research";
  if (hint?.status === "review" || input.researchStatus === "review") return "Review Package";
  if (!hasUsableCover(input)) return "Acquire Cover";
  if (!hasStory(hint, input.storyCount ?? 0)) return "Fix Renderability";
  if (!isRenderable(hint, input.researchStatus)) return "Fix Renderability";
  if (isPatronExperienceReady(input)) return "Experience Ready";
  return "Fix Renderability";
}

export function readinessPct(ready: number, total: number): number {
  return completionPct(ready, total);
}

/** Exclusive blocker for cohort readiness analysis (first failing gate). */
export function classifyReadinessBlocker(
  input: Bp2ReadinessInput & { inLibrary: boolean; researchStatus: string | null },
): keyof Bp2ReadinessBlockers | "ready" | "notInLibrary" {
  const { row, hint } = input;
  if (!input.inLibrary) return "notInLibrary";
  if (!row.rvtr) return "missingResearch";
  if (!hasResearchPackage(row)) return "missingResearch";
  if (hint?.status === "review" || input.researchStatus === "review") return "needsReview";
  if (!hasUsableCover(input)) return "missingCover";
  if (!hasStory(hint, input.storyCount ?? 0)) return "renderability";
  if (!isRenderable(hint, input.researchStatus ?? hint?.status ?? null)) return "renderability";
  if (isPatronExperienceReady(input)) return "ready";
  return "renderability";
}

export function emptyReadinessBlockers(): Bp2ReadinessBlockers {
  return {
    missingResearch: 0,
    needsReview: 0,
    missingCover: 0,
    renderability: 0,
  };
}

export function buildPathToReady(
  input: Bp2ReadinessInput & { researchStatus: string | null },
): Bp2PathToReady {
  const { row, hint } = input;
  const researchStatus = input.researchStatus ?? hint?.status ?? null;
  const reviewApproved = researchStatus === "published";
  const reviewPending = researchStatus === "review";

  const steps = [
    { label: "RVTR Assigned", done: Boolean(row.rvtr) },
    { label: "Cover Present", done: Boolean(row.rvtr && hasUsableCover(input)) },
    { label: "Research Built", done: hasResearchPackage(row) },
    { label: "Story Present", done: hasStory(hint, input.storyCount ?? 0) },
    {
      label: reviewPending ? "Review Pending" : "Review Approved",
      done: reviewApproved,
    },
    { label: "Renderable", done: isRenderable(hint, researchStatus) },
  ];

  return {
    steps,
    nextStep: computeNextAction(input),
  };
}
