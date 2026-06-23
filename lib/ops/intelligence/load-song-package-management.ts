import "server-only";

import { closeSync, openSync, readSync } from "fs";

import { packageConfidence } from "./artifact-readiness";
import { loadBackfillQueue } from "./backfill-queue";
import { backfillQueuePath, songPackageIndexPath } from "./paths";
import { loadSongPackage, loadSongPackageIndex } from "./song-package-store";
import type { PackageIssueFlag, SongPackage, SongPackageStatus } from "./song-package-types";
import { loadVdjIdentityCoverage } from "./vdj-identity-coverage";

export type SongPackageManagementStatus =
  | "package_exists"
  | "needs_review"
  | "missing_package";

export type SongPackageCoverStatus = "has_cover" | "missing_cover";

export type SongPackageManagementRow = {
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  playCount: number;
  packageStatus: SongPackageManagementStatus;
  packageStatusLabel: string;
  packageRawStatus: SongPackageStatus | null;
  packageUpdatedAt: string | null;
  coverStatus: SongPackageCoverStatus;
  coverStatusLabel: string;
  detailHref: string | null;
  coverUrl: string | null;
  healthScore: number;
  flagCount: number;
  cardCount: number;
  hiddenCardCount: number;
  firstCardHeadline: string | null;
  firstCardFact: string | null;
  issueFlags: PackageIssueFlag[];
};

export type SongPackageManagementView = {
  rows: SongPackageManagementRow[];
  years: number[];
  artists: string[];
  stats: {
    total: number;
    packageExists: number;
    needsReview: number;
    missingPackage: number;
    missingCover: number;
    retroverseCoverage: {
      distinctRvtrs: number;
      mappedVdjFiles: number;
      coveragePct: number;
    };
  };
};

export type SongPackageRowsParams = {
  query?: string;
  year?: string;
  artist?: string;
  packageStatus?: "all" | SongPackageManagementStatus;
  coverStatus?: "all" | SongPackageCoverStatus;
  minimumPlayCount?: number;
  quickFilter?: "missing" | "ready" | "review" | "most_played_missing" | "recent" | null;
  mode?: "queue" | "gallery" | "maintenance";
  page?: number;
  pageSize?: number;
};

export type SongPackageRowsResult = {
  rows: SongPackageManagementRow[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

type Candidate = {
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  playCount: number;
  packageRawStatus: SongPackageStatus | null;
  packageUpdatedAt: string | null;
  coverMissing: boolean;
};

type QueueStats = {
  rvtrs: Set<string>;
  missingCover: number;
  missingPackage: number;
  missingArtifacts: number;
};

type IndexStats = {
  rvtrs: Set<string>;
  packageExists: number;
  needsReview: number;
};

async function loadQueueStats(): Promise<QueueStats> {
  let fd: number | null = null;
  try {
    const rvtrs = new Set<string>();
    let missingCover = 0;
    let missingPackage = 0;
    let missingArtifacts = 0;
    let carry = "";
    const buffer = Buffer.allocUnsafe(64 * 1024);

    function scan(text: string, final = false) {
      const safeLength = final ? text.length : Math.max(0, text.length - 120);
      for (const match of text.matchAll(/"rvtr":\s*"(RVTR\d{6})"/g)) {
        if ((match.index ?? 0) + match[0].length <= safeLength) rvtrs.add(match[1]!);
      }
      for (const match of text.matchAll(/"filter":\s*"missing_cover"/g)) {
        if ((match.index ?? 0) + match[0].length <= safeLength) missingCover += 1;
      }
      for (const match of text.matchAll(/"filter":\s*"missing_package"/g)) {
        if ((match.index ?? 0) + match[0].length <= safeLength) missingPackage += 1;
      }
      for (const match of text.matchAll(/"filter":\s*"missing_artifacts"/g)) {
        if ((match.index ?? 0) + match[0].length <= safeLength) missingArtifacts += 1;
      }
      carry = text.slice(-120);
    }

    fd = openSync(backfillQueuePath(), "r");
    while (true) {
      const bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      scan(carry + buffer.toString("utf8", 0, bytesRead));
    }
    scan(carry, true);

    return { rvtrs, missingCover, missingPackage, missingArtifacts };
  } catch {
    return { rvtrs: new Set(), missingCover: 0, missingPackage: 0, missingArtifacts: 0 };
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

async function loadIndexStats(): Promise<IndexStats> {
  let fd: number | null = null;
  try {
    const rvtrs = new Set<string>();
    let packageExists = 0;
    let needsReview = 0;
    let carry = "";
    const buffer = Buffer.allocUnsafe(64 * 1024);

    function scan(text: string, final = false) {
      const safeLength = final ? text.length : Math.max(0, text.length - 120);
      for (const match of text.matchAll(/"rvtr":\s*"(RVTR\d{6})"/g)) {
        if ((match.index ?? 0) + match[0].length <= safeLength) rvtrs.add(match[1]!);
      }
      for (const match of text.matchAll(/"status":\s*"(approved|published)"/g)) {
        if ((match.index ?? 0) + match[0].length <= safeLength) packageExists += 1;
      }
      for (const match of text.matchAll(/"status":\s*"(draft|processing|review|cards_ready)"/g)) {
        if ((match.index ?? 0) + match[0].length <= safeLength) needsReview += 1;
      }
      carry = text.slice(-120);
    }

    fd = openSync(songPackageIndexPath(), "r");
    while (true) {
      const bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      scan(carry + buffer.toString("utf8", 0, bytesRead));
    }
    scan(carry, true);

    return { rvtrs, packageExists, needsReview };
  } catch {
    return { rvtrs: new Set(), packageExists: 0, needsReview: 0 };
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function packageSummary(pkg: SongPackage | null, coverMissing: boolean) {
  const hiddenCardCount = pkg?.storyCards.filter((card) => card.hidden).length ?? 0;
  const issueFlags = pkg?.issueFlags ?? [];
  const inferredIssues: PackageIssueFlag[] = [];
  if (coverMissing) inferredIssues.push("missing_cover");
  if (pkg && pkg.researchVault.length === 0 && pkg.status !== "draft") inferredIssues.push("bad_research");
  const activeCard = pkg?.storyCards.find((card) => !card.hidden && card.rank > 0) ?? pkg?.storyCards[0];
  return {
    coverUrl: pkg?.metadata.coverUrl ?? null,
    healthScore: pkg ? packageConfidence(pkg) : 0,
    flagCount: new Set([...issueFlags, ...inferredIssues]).size + hiddenCardCount,
    cardCount: pkg?.storyCards.length ?? 0,
    hiddenCardCount,
    firstCardHeadline: activeCard?.headline ?? null,
    firstCardFact: activeCard?.fact ?? null,
    issueFlags: [...new Set([...issueFlags, ...inferredIssues])],
  };
}

function packageStatusFor(status: SongPackageStatus | null): {
  status: SongPackageManagementStatus;
  label: string;
} {
  if (!status) {
    return { status: "missing_package", label: "Missing Package" };
  }

  if (status === "approved" || status === "published") {
    return { status: "package_exists", label: "Package Exists" };
  }

  return { status: "needs_review", label: "Needs Review" };
}

async function loadCandidates(): Promise<Candidate[]> {
  const [queue, index] = await Promise.all([loadBackfillQueue(), loadSongPackageIndex()]);
  const byRvtr = new Map<string, Candidate>();

  for (const entry of queue.entries) {
    const existing = byRvtr.get(entry.rvtr);
    const next: Candidate = {
      rvtr: entry.rvtr,
      artist: entry.artist,
      title: entry.title,
      year: null,
      playCount: entry.playCount,
      packageRawStatus: null,
      packageUpdatedAt: null,
      coverMissing: entry.filter === "missing_cover",
    };
    if (!existing || entry.playCount > existing.playCount) {
      byRvtr.set(entry.rvtr, { ...next, coverMissing: next.coverMissing || existing?.coverMissing || false });
    } else if (next.coverMissing) {
      existing.coverMissing = true;
    }
  }

  for (const entry of index.packages) {
    const existing = byRvtr.get(entry.rvtr);
    byRvtr.set(entry.rvtr, {
      rvtr: entry.rvtr,
      artist: existing?.artist || entry.artist,
      title: existing?.title || entry.title,
      year: existing?.year ?? null,
      playCount: existing?.playCount ?? 0,
      packageRawStatus: entry.status,
      packageUpdatedAt: entry.updatedAt,
      coverMissing: existing?.coverMissing ?? false,
    });
  }

  return [...byRvtr.values()];
}

function sortCandidates(candidates: Candidate[], quickFilter: SongPackageRowsParams["quickFilter"]) {
  return [...candidates].sort((a, b) => {
    if (quickFilter === "recent") {
      return (b.packageUpdatedAt ?? "").localeCompare(a.packageUpdatedAt ?? "");
    }
    if (b.playCount !== a.playCount) return b.playCount - a.playCount;
    return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
  });
}

function filterCandidates(candidates: Candidate[], params: SongPackageRowsParams): Candidate[] {
  const q = params.query?.trim().toLowerCase() ?? "";
  const packageStatus =
    params.quickFilter === "missing" || params.quickFilter === "most_played_missing"
      ? "missing_package"
      : params.quickFilter === "ready"
        ? "package_exists"
        : params.quickFilter === "review"
          ? "needs_review"
          : params.packageStatus ?? "all";
  const coverStatus = params.coverStatus ?? "all";
  const minPlay = params.minimumPlayCount ?? 0;

  return candidates.filter((candidate) => {
    const status = packageStatusFor(candidate.packageRawStatus).status;
    const candidateCoverStatus: SongPackageCoverStatus = candidate.coverMissing
      ? "missing_cover"
      : "has_cover";
    if (q && ![candidate.artist, candidate.title, candidate.rvtr].some((value) => value.toLowerCase().includes(q))) {
      return false;
    }
    if (params.artist && params.artist !== "all" && candidate.artist !== params.artist) return false;
    if (params.year && params.year !== "all" && String(candidate.year ?? "") !== params.year) return false;
    if (packageStatus !== "all" && status !== packageStatus) return false;
    if (coverStatus !== "all" && candidateCoverStatus !== coverStatus) return false;
    if (minPlay > 0 && candidate.playCount < minPlay) return false;
    if (params.quickFilter === "recent" && !candidate.packageUpdatedAt) return false;
    if (params.mode === "gallery" && !candidate.packageRawStatus) return false;
    if (params.mode === "maintenance" && !candidate.coverMissing && !candidate.packageRawStatus) return false;
    return true;
  });
}

async function candidateToRow(candidate: Candidate): Promise<SongPackageManagementRow> {
  const pkg = candidate.packageRawStatus ? await loadSongPackage(candidate.rvtr) : null;
  const rawStatus = candidate.packageRawStatus ?? null;
  const packageStatus = packageStatusFor(rawStatus);
  const coverMissing = candidate.coverMissing && !pkg?.metadata.coverUrl;
  const summary = packageSummary(pkg, coverMissing);

  return {
    rvtr: candidate.rvtr,
    artist: pkg?.metadata.artist ?? candidate.artist,
    title: pkg?.metadata.title ?? candidate.title,
    year: pkg?.metadata.year ?? candidate.year,
    playCount: pkg?.metadata.playCount ?? candidate.playCount,
    packageStatus: packageStatus.status,
    packageStatusLabel: packageStatus.label,
    packageRawStatus: rawStatus,
    packageUpdatedAt: candidate.packageUpdatedAt,
    coverStatus: coverMissing ? "missing_cover" : "has_cover",
    coverStatusLabel: coverMissing ? "Missing Cover" : "Cover Exists",
    detailHref: rawStatus ? `/ops/intelligence/package/${candidate.rvtr}` : null,
    ...summary,
  };
}

export async function loadSongPackageManagementView(): Promise<SongPackageManagementView> {
  const [indexStats, queueStats, vdjCoverage] = await Promise.all([
    loadIndexStats(),
    loadQueueStats(),
    loadVdjIdentityCoverage(),
  ]);
  const totalRvtrs = new Set([...indexStats.rvtrs, ...queueStats.rvtrs]);

  return {
    rows: [],
    years: [],
    artists: [],
    stats: {
      total: totalRvtrs.size,
      packageExists: indexStats.packageExists,
      needsReview: indexStats.needsReview,
      missingPackage: queueStats.missingPackage,
      missingCover: queueStats.missingCover,
      retroverseCoverage: {
        distinctRvtrs: vdjCoverage.distinctRvtrs,
        mappedVdjFiles: vdjCoverage.mappedVdjTracks,
        coveragePct: vdjCoverage.coveragePct,
      },
    },
  };
}

export async function loadSongPackageManagementRows(
  params: SongPackageRowsParams,
): Promise<SongPackageRowsResult> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 50, 100));
  const page = Math.max(1, params.page ?? 1);
  const candidates = sortCandidates(filterCandidates(await loadCandidates(), params), params.quickFilter);
  const total = candidates.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const rows = await Promise.all(candidates.slice(start, start + pageSize).map(candidateToRow));

  return {
    rows,
    page: safePage,
    pageSize,
    total,
    pageCount,
  };
}
