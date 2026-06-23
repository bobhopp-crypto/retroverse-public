import type { ResearchVaultEntry, SongPackageMetadata } from "./song-package-types";

/** Retroverse Canon First — source priority (lowest number wins conflicts). */
export const CANON_PRIORITY = [
  "rvtr",
  "cover",
  "billboard",
  "vdj_metadata",
  "play_counts",
  "rv_tags",
  "year_workspace",
  "artist_relationships",
  "external",
] as const;

export type CanonPriorityTier = (typeof CANON_PRIORITY)[number];

const TIER_RANK: Record<CanonPriorityTier, number> = {
  rvtr: 1,
  cover: 2,
  billboard: 3,
  vdj_metadata: 4,
  play_counts: 5,
  rv_tags: 6,
  year_workspace: 7,
  artist_relationships: 8,
  external: 9,
};

const CANON_VAULT_PREFIX = "retroverse-";

/** Vault entries sourced from Retroverse graph / library (not external enrichment). */
export function isCanonVaultEntry(entry: ResearchVaultEntry): boolean {
  return entry.id.startsWith(CANON_VAULT_PREFIX);
}

/** Wikipedia and other fetched enrichment sources. */
export function isExternalVaultEntry(entry: ResearchVaultEntry): boolean {
  return !isCanonVaultEntry(entry);
}

export function canonTierRank(tier: CanonPriorityTier): number {
  return TIER_RANK[tier];
}

/** Canonical fields that external research must never override. */
export type CanonSnapshot = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  albumTitle: string | null;
  coverUrl: string | null;
  peakHot100: number | null;
  chartWeeks: number | null;
  playCount: number | null;
  tags: string[];
  videoInfo: string | null;
  relatedArtists: string[];
};

export function canonSnapshotFromMetadata(metadata: SongPackageMetadata): CanonSnapshot {
  return {
    rvtr: metadata.rvtr,
    title: metadata.title,
    artist: metadata.artist,
    year: metadata.year,
    albumTitle: metadata.albumTitle,
    coverUrl: metadata.coverUrl,
    peakHot100: metadata.peakHot100,
    chartWeeks: metadata.chartWeeks,
    playCount: metadata.playCount,
    tags: metadata.tags ?? [],
    videoInfo: metadata.videoInfo,
    relatedArtists: metadata.relatedArtists ?? [],
  };
}

/** True when external fact contradicts locked Retroverse canon. */
export function conflictsWithCanon(factText: string, canon: CanonSnapshot): boolean {
  const text = factText.toLowerCase();

  if (canon.peakHot100 != null) {
    const hot100 = [...factText.matchAll(/(?:hot\s*100|billboard)[^.]*#\s*(\d+)/gi)].map((m) =>
      Number(m[1]),
    );
    const peaks = [...factText.matchAll(/#\s*(\d+)/g)].map((m) => Number(m[1]));
    const chartNums = [...hot100, ...peaks];
    if (chartNums.some((n) => n !== canon.peakHot100)) return true;
  }

  if (canon.playCount != null && /play\s*count|rotation|spins/i.test(factText)) {
    const nums = [...factText.matchAll(/\b(\d{1,6})\b/g)].map((m) => Number(m[1]));
    if (nums.some((n) => n !== canon.playCount && n < 100_000)) return true;
  }

  const titleNorm = canon.title.toLowerCase();
  if (titleNorm.length > 4) {
    const titleClaims = text.match(/(?:titled|called|named)\s+"([^"]+)"/i);
    if (titleClaims?.[1] && titleClaims[1].toLowerCase() !== titleNorm) return true;
  }

  return false;
}

/**
 * Boost confidence when external fact aligns with Retroverse canon.
 * Penalize when only weakly related.
 */
export function scoreAgainstCanon(
  baseConfidence: number,
  factText: string,
  canon: CanonSnapshot,
): number {
  let score = baseConfidence;
  const lower = factText.toLowerCase();

  if (canon.title.length > 3 && lower.includes(canon.title.toLowerCase())) score += 0.04;
  if (canon.artist.length > 3 && lower.includes(canon.artist.toLowerCase())) score += 0.04;
  if (canon.albumTitle && lower.includes(canon.albumTitle.toLowerCase())) score += 0.03;
  if (canon.peakHot100 != null && lower.includes(`#${canon.peakHot100}`)) score += 0.06;
  for (const tag of canon.tags) {
    if (tag && lower.includes(tag.replace(/^#/, "").toLowerCase())) score += 0.02;
  }
  if (conflictsWithCanon(factText, canon)) score *= 0.35;

  return Math.min(1, Math.max(0, score));
}
