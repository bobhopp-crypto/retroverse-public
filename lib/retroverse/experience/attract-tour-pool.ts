import "server-only";

import { readFile } from "fs/promises";

import { isSongExperienceRenderable } from "@/lib/ops/intelligence/song-experience-renderability";
import {
  loadSongPackageIndex,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import { backfillQueuePath } from "@/lib/ops/intelligence/paths";
import type { SongPackageStatus } from "@/lib/ops/intelligence/song-package-types";

export type AttractTourEntry = {
  rvtr: string;
  title: string;
  artist: string;
  playCount: number;
  experienceReady: boolean;
  researchComplete: boolean;
  hasCover: boolean;
  storyScore: number;
  releaseYear: number | null;
  score: number;
};

function guessReleaseYear(title: string): number | null {
  const match = title.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1950 && year <= 2029 ? year : null;
}

const RESEARCH_STATUSES = new Set<SongPackageStatus>([
  "review",
  "cards_ready",
  "approved",
  "published",
]);

function seededShuffle<T>(items: T[], seed: number): T[] {
  const next = [...items];
  let state = seed >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function storyScoreFromStatus(status: SongPackageStatus): number {
  if (status === "published") return 8;
  if (status === "approved" || status === "cards_ready") return 5;
  if (status === "review") return 2;
  return 0;
}

function computeScore(entry: Omit<AttractTourEntry, "score">): number {
  let score = entry.playCount * 1000;
  if (entry.experienceReady) score += 800;
  if (entry.researchComplete) score += 400;
  if (entry.hasCover) score += 120;
  score += Math.min(entry.storyScore, 12) * 35;
  return score;
}

async function loadVdjPlayCounts(): Promise<
  Map<string, { playCount: number; title: string; artist: string }>
> {
  const counts = new Map<string, { playCount: number; title: string; artist: string }>();
  try {
    const raw = await readFile(backfillQueuePath(), "utf8");
    const parsed = JSON.parse(raw) as {
      entries?: Array<{ rvtr?: string; playCount?: number; title?: string; artist?: string }>;
    };
    for (const entry of parsed.entries ?? []) {
      const rvtr = normalizePackageRvtr(entry.rvtr ?? "");
      if (!rvtr) continue;
      const playCount = entry.playCount ?? 0;
      const existing = counts.get(rvtr);
      if (!existing || playCount > existing.playCount) {
        counts.set(rvtr, {
          playCount,
          title: entry.title?.trim() || rvtr,
          artist: entry.artist?.trim() || "",
        });
      }
    }
  } catch {
    /* queue optional */
  }
  return counts;
}

/** Large rotating attract pool — VDJ play count first, then experience richness. */
export async function buildAttractTourPool(sessionSeed: number): Promise<{
  seed: number;
  entries: AttractTourEntry[];
}> {
  const [packageIndex, vdjPlays] = await Promise.all([
    loadSongPackageIndex(),
    loadVdjPlayCounts(),
  ]);

  const indexByRvtr = new Map(
    packageIndex.packages
      .map((entry) => {
        const rvtr = normalizePackageRvtr(entry.rvtr);
        return rvtr ? ([rvtr, entry] as const) : null;
      })
      .filter((row): row is [string, (typeof packageIndex.packages)[number]] => row != null),
  );

  const byRvtr = new Map<string, AttractTourEntry>();

  for (const [rvtr, vdj] of vdjPlays) {
    const pkgEntry = indexByRvtr.get(rvtr);
    const status = (pkgEntry?.status ?? "draft") as SongPackageStatus;
    const storyScore = storyScoreFromStatus(status);
    const base = {
      rvtr,
      title: pkgEntry?.title ?? vdj.title,
      artist: pkgEntry?.artist ?? vdj.artist,
      playCount: vdj.playCount,
      experienceReady: Boolean(pkgEntry && isSongExperienceRenderable(status)),
      researchComplete: RESEARCH_STATUSES.has(status),
      hasCover: status === "published" || status === "approved",
      storyScore,
      releaseYear: guessReleaseYear(pkgEntry?.title ?? vdj.title),
    };
    byRvtr.set(rvtr, { ...base, score: computeScore(base) });
  }

  for (const pkgEntry of packageIndex.packages) {
    const rvtr = normalizePackageRvtr(pkgEntry.rvtr);
    if (!rvtr || byRvtr.has(rvtr)) continue;
    const status = pkgEntry.status;
    const storyScore = storyScoreFromStatus(status);
    const base = {
      rvtr,
      title: pkgEntry.title,
      artist: pkgEntry.artist,
      playCount: 0,
      experienceReady: isSongExperienceRenderable(status),
      researchComplete: RESEARCH_STATUSES.has(status),
      hasCover: status === "published" || status === "approved",
      storyScore,
      releaseYear: guessReleaseYear(pkgEntry.title),
    };
    byRvtr.set(rvtr, { ...base, score: computeScore(base) });
  }

  const sorted = [...byRvtr.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const topTier = sorted.filter((e) => e.playCount > 0 || e.experienceReady);
  const rest = sorted.filter((e) => e.playCount === 0 && !e.experienceReady);
  const pool = [...topTier, ...rest].slice(0, 2000);

  const shuffleBand = pool.slice(0, Math.min(400, pool.length));
  const tail = pool.slice(shuffleBand.length);
  const shuffledHead = seededShuffle(shuffleBand, sessionSeed);

  return {
    seed: sessionSeed,
    entries: [...shuffledHead, ...tail],
  };
}
