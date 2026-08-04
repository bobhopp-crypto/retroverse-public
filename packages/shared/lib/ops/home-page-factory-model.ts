import type { HomePageCanonicalPreflight } from "@/lib/ops/home-page-factory-eligibility";
import type { IssueGenerationMonitorJob } from "@/lib/ops/issue-generation-monitor";

export const FACTORY_GRID_COLUMNS = "48px 56px minmax(280px, 2fr) minmax(200px, 1.1fr) 72px 150px";

/** Operator-safe row — no filesystem paths or Browser+ internals. */
export type FactoryBrowserRow = {
  id: string;
  artist: string;
  title: string;
  album: string;
  year: number | null;
  playCount: number | null;
  rvtr: string | null;
  thumbnailUrl: string | null;
  lengthSeconds: number | null;
  fileExists: boolean;
  isVideo: boolean;
  canonicalPreflight?: HomePageCanonicalPreflight;
};

export type OperatorStatus = "READY" | "REVIEW" | "COMPLETE" | "NEEDS ATTENTION";

/** V1 exposes only frame review and record-only approval actions. */
export type FactoryAction = "APPROVE HOMEPAGE" | "CHOOSE DIFFERENT FRAME" | "OPEN HOMEPAGE" | "NEXT VIDEO";

export type FactoryViewModel = {
  identity: {
    rvtr: string | null;
    title: string;
    artist: string;
    album: string;
    year: number | null;
    playCount: number;
  };
  eligibility: {
    productionEligible: boolean;
    publicReady: boolean;
    reason: string;
    warnings: string[];
  };
  status: OperatorStatus;
  statusReason: string;
  sourceVideo: {
    available: boolean;
    thumbnailHref: string | null;
    posterHref: string | null;
    durationSeconds: number | null;
  };
  frameEvidence: {
    state: "available" | "absent";
    contactSheetHref: string | null;
    frameCount: number;
  };
  homepage: {
    available: boolean;
    previewHref: string | null;
    approved: boolean;
  };
  magazineMode: boolean;
  heroFrame: {
    available: boolean;
    previewHref: string | null;
    timestamp: number | null;
    reason: string | null;
  };
  primaryAction: FactoryAction;
  secondaryAction: FactoryAction | null;
  nextVideoIsPrimary: boolean;
  actionEnabled: boolean;
  secondaryActionEnabled: boolean;
  actionHint: string;
};

export function isProductionEligible(row: FactoryBrowserRow): boolean {
  if (row.canonicalPreflight) return row.canonicalPreflight.eligible;
  return Boolean(row.isVideo && row.fileExists && row.rvtr && (row.playCount ?? 0) >= 1);
}

export function eligibilityReason(row: FactoryBrowserRow): string {
  if (row.canonicalPreflight) return row.canonicalPreflight.reasonLabel;
  if (!row.isVideo || !row.fileExists) return "Local video unavailable";
  if (!row.rvtr) return "Missing RVTR";
  if ((row.playCount ?? 0) < 1) return "Play count below 1";
  return "Eligible for homepage production";
}

export function homePageJobFor(
  jobs: IssueGenerationMonitorJob[],
  row: FactoryBrowserRow,
): IssueGenerationMonitorJob | null {
  if (!row.rvtr) return null;
  return jobs.find((job) => job.rvtr === row.rvtr) ?? null;
}

function hasSelectedHeroFrame(job: IssueGenerationMonitorJob | null): boolean {
  return Boolean(job?.magazineHeroFrame?.available);
}

function v1ReviewState(job: IssueGenerationMonitorJob | null): "pending-review" | "approved" | "rejected" {
  return job?.reviewState === "approved" || job?.reviewState === "rejected" ? job.reviewState : "pending-review";
}

/**
 * V1 status is intentionally limited to local video eligibility, selected real
 * frame, and record-only review state. Experimental artwork/pilot fields are
 * retained in the monitor for archive compatibility but never determine this UI.
 */
export function operatorStatusFor(
  row: FactoryBrowserRow,
  job: IssueGenerationMonitorJob | null,
): { status: OperatorStatus; reason: string } {
  if (!isProductionEligible(row)) {
    return { status: "NEEDS ATTENTION", reason: eligibilityReason(row) };
  }
  if (!hasSelectedHeroFrame(job)) {
    return { status: "READY", reason: "Select a real hero frame" };
  }
  if (v1ReviewState(job) === "approved") {
    return { status: "COMPLETE", reason: "Homepage approval recorded" };
  }
  return { status: "REVIEW", reason: "Selected frame ready · awaiting approval" };
}

function actionFor(
  status: OperatorStatus,
  publicReady: boolean,
): {
  action: FactoryAction;
  enabled: boolean;
  hint: string;
  secondary: FactoryAction | null;
  secondaryEnabled: boolean;
  nextVideoIsPrimary: boolean;
} {
  if (status === "NEEDS ATTENTION") {
    return {
      action: "NEXT VIDEO",
      enabled: true,
      hint: "Resolve the attention reason before selecting a frame",
      secondary: null,
      secondaryEnabled: false,
      nextVideoIsPrimary: true,
    };
  }
  if (status === "READY") {
    return {
      action: "CHOOSE DIFFERENT FRAME",
      enabled: true,
      hint: "Choose an existing real video frame",
      secondary: "NEXT VIDEO",
      secondaryEnabled: true,
      nextVideoIsPrimary: false,
    };
  }
  if (status === "COMPLETE") {
    return {
      action: "OPEN HOMEPAGE",
      enabled: true,
      hint: "Open the approved local homepage preview",
      secondary: "CHOOSE DIFFERENT FRAME",
      secondaryEnabled: true,
      nextVideoIsPrimary: false,
    };
  }
  return {
    action: "APPROVE HOMEPAGE",
    enabled: publicReady,
    hint: publicReady ? "Record approval · does not publish" : "Song route required before approve",
    secondary: "CHOOSE DIFFERENT FRAME",
    secondaryEnabled: true,
    nextVideoIsPrimary: false,
  };
}

export function factoryViewModelFor(
  row: FactoryBrowserRow,
  job: IssueGenerationMonitorJob | null = null,
): FactoryViewModel {
  const { status, reason } = operatorStatusFor(row, job);
  const publicReady = row.canonicalPreflight?.publicReady ?? Boolean(row.rvtr);
  const warnings = row.canonicalPreflight?.warnings ?? [];
  const { action, enabled, hint, secondary, secondaryEnabled, nextVideoIsPrimary } = actionFor(status, publicReady);
  const rvtr = row.rvtr;
  const heroAvailable = hasSelectedHeroFrame(job);
  const approved = v1ReviewState(job) === "approved";
  const heroFrameHref = heroAvailable && rvtr ? `/api/ops/issue-generation/hero-frame?rvtr=${rvtr}` : null;
  const previewHref = heroAvailable && rvtr ? `/bobos/browser-plus/preview/${rvtr}?mode=magazine` : null;
  const sourceHref = rvtr ? `/api/ops/issue-generation/source-frame?rvtr=${rvtr}` : null;

  return {
    identity: {
      rvtr: row.rvtr,
      title: row.title,
      artist: row.artist,
      album: row.album,
      year: row.year,
      playCount: row.playCount ?? 0,
    },
    eligibility: {
      productionEligible: isProductionEligible(row),
      publicReady,
      reason: eligibilityReason(row),
      warnings,
    },
    status,
    statusReason: reason,
    sourceVideo: {
      available: Boolean(row.fileExists && row.isVideo),
      thumbnailHref: row.thumbnailUrl,
      posterHref: heroFrameHref ?? sourceHref,
      durationSeconds: row.lengthSeconds,
    },
    frameEvidence: {
      state: heroAvailable ? "available" : "absent",
      contactSheetHref: rvtr ? `/api/ops/issue-generation/frame-sheet?rvtr=${rvtr}` : null,
      frameCount: job?.frameSelection?.selectedTimestamps.length ?? 0,
    },
    homepage: {
      available: Boolean(previewHref),
      previewHref,
      approved,
    },
    magazineMode: heroAvailable,
    heroFrame: {
      available: heroAvailable,
      previewHref: heroFrameHref,
      timestamp: job?.magazineHeroFrame?.timestamp ?? null,
      reason: job?.magazineHeroFrame?.reason ?? null,
    },
    primaryAction: action,
    secondaryAction: secondary,
    nextVideoIsPrimary,
    actionEnabled: enabled,
    secondaryActionEnabled: secondaryEnabled,
    actionHint: hint,
  };
}

export function filterFactoryRows(
  rows: FactoryBrowserRow[],
  jobs: IssueGenerationMonitorJob[],
  search: string,
): FactoryBrowserRow[] {
  const needle = search.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (!needle) return true;
      const text = `${row.artist} ${row.title} ${row.album} ${row.rvtr ?? ""}`.toLowerCase();
      return text.includes(needle);
    })
    .sort((a, b) => {
      const aJob = homePageJobFor(jobs, a);
      const bJob = homePageJobFor(jobs, b);
      const aHasHero = hasSelectedHeroFrame(aJob) ? 1 : 0;
      const bHasHero = hasSelectedHeroFrame(bJob) ? 1 : 0;
      return bHasHero - aHasHero || (b.playCount ?? 0) - (a.playCount ?? 0);
    });
}

export function nextVideoId(rows: FactoryBrowserRow[], currentId: string | null): string | null {
  if (!rows.length) return null;
  if (!currentId) return rows[0]?.id ?? null;
  const index = rows.findIndex((row) => row.id === currentId);
  if (index < 0) return rows[0]?.id ?? null;
  return rows[(index + 1) % rows.length]?.id ?? null;
}

export function requiresSkipConfirmation(status: OperatorStatus): boolean {
  return status === "REVIEW" || status === "NEEDS ATTENTION";
}
