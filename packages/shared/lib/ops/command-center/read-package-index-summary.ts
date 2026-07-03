import "server-only";

import { readJsonFileSafe } from "@/lib/ops/studio/safe-io";
import { bundledSongPackageIndexPath } from "@/lib/ops/intelligence/paths";

import type { PackageHighlight, PackageIndexSummary } from "./types";

type PackageIndexFile = {
  updatedAt?: string;
  packages?: Array<{
    rvtr?: string;
    title?: string;
    artist?: string;
    status?: string;
    updatedAt?: string | null;
  }>;
};

function toHighlight(entry: NonNullable<PackageIndexFile["packages"]>[number]): PackageHighlight | null {
  const rvtr = entry.rvtr?.trim().toUpperCase();
  if (!rvtr) return null;
  return {
    rvtr,
    title: entry.title?.trim() || rvtr,
    artist: entry.artist?.trim() || "Unknown artist",
    status: entry.status?.trim().toLowerCase() || "draft",
    updatedAt: entry.updatedAt ?? null,
  };
}

function isNewer(candidate: PackageHighlight | null, next: PackageHighlight): PackageHighlight {
  if (!candidate) return next;
  const candidateMs = candidate.updatedAt ? Date.parse(candidate.updatedAt) : 0;
  const nextMs = next.updatedAt ? Date.parse(next.updatedAt) : 0;
  return nextMs >= candidateMs ? next : candidate;
}

export async function readPackageIndexSummary(): Promise<PackageIndexSummary> {
  const parsed = await readJsonFileSafe<PackageIndexFile | null>(
    bundledSongPackageIndexPath(),
    null,
    2000,
  );

  let published = 0;
  let review = 0;
  let draft = 0;
  let latestPublished: PackageHighlight | null = null;
  let latestReview: PackageHighlight | null = null;
  let latestUpdated: PackageHighlight | null = null;

  for (const entry of parsed?.packages ?? []) {
    const highlight = toHighlight(entry);
    if (!highlight) continue;

    latestUpdated = isNewer(latestUpdated, highlight);

    if (highlight.status === "published") {
      published += 1;
      latestPublished = isNewer(latestPublished, highlight);
    } else if (highlight.status === "review") {
      review += 1;
      latestReview = isNewer(latestReview, highlight);
    } else {
      draft += 1;
    }
  }

  return {
    total: parsed?.packages?.length ?? 0,
    published,
    review,
    draft,
    updatedAt: parsed?.updatedAt ?? null,
    latestPublished,
    latestReview,
    latestUpdated,
  };
}
