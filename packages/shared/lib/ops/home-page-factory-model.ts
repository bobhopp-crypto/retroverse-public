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

/** Operator-facing states only. */
export type OperatorStatus = "READY" | "PREPARING" | "REVIEW" | "COMPLETE" | "NEEDS ATTENTION";

export type FactoryAction =
  | "EXTRACT 4 FRAMES"
  | "PREPARE ARTWORK"
  | "GENERATE ARTWORK"
  | "REGENERATE ARTWORK"
  | "APPROVE HOMEPAGE"
  | "OPEN HOMEPAGE"
  | "NEXT VIDEO";

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
  sourceVideo: { available: boolean; thumbnailHref: string | null; durationSeconds: number | null };
  frameEvidence: {
    state: "available" | "absent" | "pending" | "failed";
    contactSheetHref: string | null;
    frameCount: number;
  };
  artwork: {
    available: boolean;
    previewHref: string | null;
    reviewState: "none" | "pending-review" | "approved" | "rejected";
  };
  homepage: {
    available: boolean;
    previewHref: string | null;
    approved: boolean;
  };
  primaryAction: FactoryAction;
  actionEnabled: boolean;
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

/**
 * Map detailed checkpoint / eligibility into five operator states.
 */
export function operatorStatusFor(
  row: FactoryBrowserRow,
  job: IssueGenerationMonitorJob | null,
): { status: OperatorStatus; reason: string } {
  if (!isProductionEligible(row)) {
    return { status: "NEEDS ATTENTION", reason: eligibilityReason(row) };
  }

  if (!job || job.origin === "prototype") {
    return { status: "READY", reason: "Eligible · no production artifacts yet" };
  }

  if (job.status === "pending") {
    return { status: "PREPARING", reason: "Preparation in progress" };
  }

  if (job.status === "failed" || job.status === "skipped") {
    return { status: "NEEDS ATTENTION", reason: job.reason ?? "Production step failed" };
  }

  if (job.status === "succeeded") {
    const review = job.generatedOutput?.reviewState;
    if (review === "approved") {
      return { status: "COMPLETE", reason: "Homepage artwork approved" };
    }
    if (review === "rejected") {
      return { status: "REVIEW", reason: job.generatedOutput?.reviewReason ?? "Marked for regeneration" };
    }
    if (job.generatedOutput?.available) {
      return { status: "REVIEW", reason: "Artwork ready for operator review" };
    }
    if (job.frameSelection?.contactSheetAvailable) {
      return { status: "READY", reason: "Frames ready · artwork not generated" };
    }
    return { status: "NEEDS ATTENTION", reason: job.reason ?? "Output incomplete" };
  }

  return { status: "READY", reason: "Eligible for homepage production" };
}

function actionFor(
  status: OperatorStatus,
  job: IssueGenerationMonitorJob | null,
  publicReady: boolean,
): { action: FactoryAction; enabled: boolean; hint: string } {
  if (status === "NEEDS ATTENTION") {
    const retryable = job?.status === "failed";
    return {
      action: "EXTRACT 4 FRAMES",
      enabled: false,
      hint: retryable
        ? "Retry available in a later phase · see status reason"
        : "Fix the attention reason before continuing",
    };
  }

  if (status === "PREPARING") {
    return { action: "PREPARE ARTWORK", enabled: false, hint: "Preparation in progress" };
  }

  if (status === "COMPLETE") {
    return {
      action: "OPEN HOMEPAGE",
      enabled: Boolean(job?.previewHref),
      hint: job?.previewHref
        ? "Open approved homepage preview"
        : "Approved · public homepage preview not wired yet",
    };
  }

  if (status === "REVIEW") {
    if (job?.generatedOutput?.reviewState === "rejected") {
      return {
        action: "REGENERATE ARTWORK",
        enabled: false,
        hint: "Regeneration not wired in Phase 1 · review existing artwork",
      };
    }
    return {
      action: "APPROVE HOMEPAGE",
      enabled: publicReady,
      hint: publicReady
        ? "Record approval · does not publish"
        : "Song route required before approve",
    };
  }

  // READY
  const hasFrames = Boolean(job?.frameSelection?.contactSheetAvailable);
  const hasArtwork = Boolean(job?.generatedOutput?.available);
  if (hasArtwork) {
    return { action: "APPROVE HOMEPAGE", enabled: publicReady, hint: "Artwork available for review" };
  }
  if (hasFrames) {
    return {
      action: "PREPARE ARTWORK",
      enabled: false,
      hint: "Frames ready · Ollama prepare not wired in Phase 1",
    };
  }
  return {
    action: "EXTRACT 4 FRAMES",
    enabled: false,
    hint: "Frame extraction not wired in Phase 1 · inspect existing evidence when available",
  };
}

export function factoryViewModelFor(
  row: FactoryBrowserRow,
  job: IssueGenerationMonitorJob | null = null,
): FactoryViewModel {
  const { status, reason } = operatorStatusFor(row, job);
  const publicReady = row.canonicalPreflight?.publicReady ?? Boolean(row.rvtr);
  const warnings = row.canonicalPreflight?.warnings ?? [];
  const { action, enabled, hint } = actionFor(status, job, publicReady);
  const frameAvailable = Boolean(job?.frameSelection?.contactSheetAvailable);
  const frameFailed = status === "NEEDS ATTENTION" && /frame|sample/i.test(reason);
  const artworkAvailable = Boolean(job?.generatedOutput?.available);
  const approved = job?.generatedOutput?.reviewState === "approved";

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
      durationSeconds: row.lengthSeconds,
    },
    frameEvidence: {
      state: frameAvailable ? "available" : frameFailed ? "failed" : status === "PREPARING" ? "pending" : "absent",
      contactSheetHref: frameAvailable && row.rvtr ? `/api/ops/issue-generation/frame-sheet?rvtr=${row.rvtr}` : null,
      frameCount: job?.frameSelection?.selectedTimestamps.length ?? 0,
    },
    artwork: {
      available: artworkAvailable,
      previewHref: job?.generatedOutput?.operatorPreviewHref ?? null,
      reviewState: job?.generatedOutput?.reviewState ?? "none",
    },
    homepage: {
      available: Boolean(job?.previewHref),
      previewHref: job?.previewHref ?? null,
      approved,
    },
    primaryAction: action,
    actionEnabled: enabled,
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
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));
}

export function nextVideoId(rows: FactoryBrowserRow[], currentId: string | null): string | null {
  if (!rows.length) return null;
  if (!currentId) return rows[0]?.id ?? null;
  const index = rows.findIndex((row) => row.id === currentId);
  if (index < 0) return rows[0]?.id ?? null;
  return rows[(index + 1) % rows.length]?.id ?? null;
}
