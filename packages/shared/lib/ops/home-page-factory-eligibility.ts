import { loadTrackPage } from "@/lib/track/load-track-page";

export type HomePageEligibilityReasonCode =
  | "missing-rvtr"
  | "missing-local-video"
  | "below-play-threshold"
  | "missing-canonical-song"
  | "missing-canonical-album"
  | "missing-artist-route"
  | "missing-year-route"
  | "unsupported-video"
  | "other";

export type HomePageCanonicalPreflight = {
  /** Production-line eligible: local video + RVTR + plays ≥ 1. */
  eligible: boolean;
  /** Public homepage can be approved: song route exists. */
  publicReady: boolean;
  status: "ready" | "needs-attention";
  reasonCode: HomePageEligibilityReasonCode;
  reasonLabel: string;
  warnings: string[];
  canonical: {
    songResolved: boolean;
    songHref?: string;
    albumResolved: boolean;
    albumHref?: string;
    artistResolved: boolean;
    artistHref?: string;
    yearResolved: boolean;
    yearHref?: string;
  };
};

type Candidate = {
  rvtr?: string | null;
  fileExists: boolean;
  isVideo: boolean;
  playCount?: number | null;
  filePath?: string;
};

const emptyCanonical = {
  songResolved: false,
  albumResolved: false,
  artistResolved: false,
  yearResolved: false,
};

/** Sync production eligibility only — no canonical route resolution. */
export function productionEligibility(candidate: Candidate): HomePageCanonicalPreflight {
  if (!candidate.rvtr) {
    return {
      eligible: false,
      publicReady: false,
      status: "needs-attention",
      reasonCode: "missing-rvtr",
      reasonLabel: "Missing RVTR",
      warnings: [],
      canonical: emptyCanonical,
    };
  }
  if (!candidate.fileExists) {
    return {
      eligible: false,
      publicReady: false,
      status: "needs-attention",
      reasonCode: "missing-local-video",
      reasonLabel: "Local video unavailable",
      warnings: [],
      canonical: emptyCanonical,
    };
  }
  if (!candidate.isVideo) {
    return {
      eligible: false,
      publicReady: false,
      status: "needs-attention",
      reasonCode: "unsupported-video",
      reasonLabel: "Unsupported video source",
      warnings: [],
      canonical: emptyCanonical,
    };
  }
  if ((candidate.playCount ?? 0) < 1) {
    return {
      eligible: false,
      publicReady: false,
      status: "needs-attention",
      reasonCode: "below-play-threshold",
      reasonLabel: "Play count below 1",
      warnings: [],
      canonical: emptyCanonical,
    };
  }
  return {
    eligible: true,
    publicReady: false,
    status: "ready",
    reasonCode: "other",
    reasonLabel: "Eligible for homepage production",
    warnings: [],
    canonical: emptyCanonical,
  };
}

/**
 * Production eligibility: local supported video, RVTR, play count ≥ 1.
 * Canonical routes are resolved for navigation honesty and do not block
 * frame inspection or artwork preparation. Missing song route blocks
 * public homepage approval (publicReady = false).
 */
export async function preflightHomePageEligibility(
  candidate: Candidate,
): Promise<HomePageCanonicalPreflight> {
  const base = productionEligibility(candidate);
  if (!base.eligible || !candidate.rvtr) return base;

  const page = await loadTrackPage(candidate.rvtr).catch(() => null);
  const songResolved = Boolean(page);
  const songHref = page ? `/track/${page.rvtr}` : undefined;
  const albumResolved = Boolean(page?.primaryAlbum);
  const albumHref = page?.primaryAlbum?.href ?? undefined;
  const artistResolved = Boolean(page?.artistHref);
  const artistHref = page?.artistHref ?? undefined;
  const yearResolved = Boolean(page?.rvYearHref);
  const yearHref = page?.rvYearHref ?? undefined;

  const warnings: string[] = [];
  if (!songResolved) warnings.push("Song route unavailable");
  if (!albumResolved) warnings.push("Album route unavailable");
  if (!artistResolved) warnings.push("Artist route unavailable");
  if (!yearResolved) warnings.push("Year route unavailable");

  return {
    ...base,
    publicReady: songResolved,
    reasonCode: songResolved ? "other" : "missing-canonical-song",
    reasonLabel: songResolved
      ? warnings.length
        ? `Eligible · ${warnings.join("; ")}`
        : "Eligible for homepage production"
      : "Eligible for production · Song route unavailable for public homepage",
    warnings,
    canonical: {
      songResolved,
      songHref,
      albumResolved,
      albumHref,
      artistResolved,
      artistHref,
      yearResolved,
      yearHref,
    },
  };
}
