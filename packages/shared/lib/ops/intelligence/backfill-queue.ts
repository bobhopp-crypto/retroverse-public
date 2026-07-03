import { mkdir, readFile, writeFile } from "fs/promises";

import { backfillQueuePath } from "./paths";
import type { VideoBackfillEntry } from "./backfill-coverage";

export type BackfillQueueFilter = "missing_cover" | "missing_package" | "missing_artifacts";

export type BackfillQueueEntry = {
  rvtr: string;
  title: string;
  artist: string;
  filter: BackfillQueueFilter;
  playCount: number;
  priorityScore: number;
  filePath: string;
  coverSource: string | null;
  confidence: number;
};

export type BackfillQueueFile = {
  version: 2;
  scope: "video";
  updatedAt: string;
  entries: BackfillQueueEntry[];
  counts: Record<BackfillQueueFilter, number>;
};

function emptyQueue(): BackfillQueueFile {
  return {
    version: 2,
    scope: "video",
    updatedAt: new Date().toISOString(),
    entries: [],
    counts: {
      missing_cover: 0,
      missing_package: 0,
      missing_artifacts: 0,
    },
  };
}

export async function loadBackfillQueue(): Promise<BackfillQueueFile> {
  try {
    const raw = await readFile(backfillQueuePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<BackfillQueueFile>;
    if (!Array.isArray(parsed.entries)) return emptyQueue();
    const counts = {
      missing_cover: parsed.counts?.missing_cover ?? 0,
      missing_package: parsed.counts?.missing_package ?? 0,
      missing_artifacts: parsed.counts?.missing_artifacts ?? 0,
    };
    return {
      version: 2,
      scope: "video",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      entries: parsed.entries.map((e) => ({
        ...e,
        playCount: e.playCount ?? 0,
        priorityScore: e.priorityScore ?? e.playCount ?? 0,
        filePath: e.filePath ?? "",
        coverSource: e.coverSource ?? null,
      })),
      counts,
    };
  } catch {
    return emptyQueue();
  }
}

export async function saveBackfillQueue(file: BackfillQueueFile): Promise<void> {
  await mkdir(backfillQueuePath().replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(backfillQueuePath(), `${JSON.stringify({ ...file, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}

/** VIDEO + RVTR — cover queue first, then package queue sorted by play count DESC. */
export function buildVideoBackfillQueue(videos: VideoBackfillEntry[]): BackfillQueueFile {
  const entries: BackfillQueueEntry[] = [];
  const counts: Record<BackfillQueueFilter, number> = {
    missing_cover: 0,
    missing_package: 0,
    missing_artifacts: 0,
  };

  const coverQueue = [...videos].filter((v) => !v.hasCover).sort((a, b) => b.priorityScore - a.priorityScore);
  for (const v of coverQueue) {
    counts.missing_cover += 1;
    entries.push({
      rvtr: v.rvtr,
      title: v.title,
      artist: v.artist,
      filter: "missing_cover",
      playCount: v.playCount,
      priorityScore: v.priorityScore,
      filePath: v.filePath,
      coverSource: v.coverSource,
      confidence: 0,
    });
  }

  const packageCandidates = videos
    .filter((v) => v.hasCover && !v.retroverseReady)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  for (const v of packageCandidates) {
    if (!v.hasPackage) {
      counts.missing_package += 1;
      entries.push({
        rvtr: v.rvtr,
        title: v.title,
        artist: v.artist,
        filter: "missing_package",
        playCount: v.playCount,
        priorityScore: v.priorityScore,
        filePath: v.filePath,
        coverSource: v.coverSource,
        confidence: v.confidence,
      });
    } else if (!v.artifactsReady) {
      counts.missing_artifacts += 1;
      entries.push({
        rvtr: v.rvtr,
        title: v.title,
        artist: v.artist,
        filter: "missing_artifacts",
        playCount: v.playCount,
        priorityScore: v.priorityScore,
        filePath: v.filePath,
        coverSource: v.coverSource,
        confidence: v.confidence,
      });
    }
  }

  return {
    version: 2,
    scope: "video",
    updatedAt: new Date().toISOString(),
    entries,
    counts,
  };
}

/** Next RVTRs for package processing — play count DESC, must have cover. */
export function nextPackageQueueRvtrs(
  queue: BackfillQueueFile,
  limit: number,
  skip: Set<string>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const eligible = queue.entries
    .filter((e) => e.filter === "missing_package" || e.filter === "missing_artifacts")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  for (const entry of eligible) {
    if (out.length >= limit) break;
    if (seen.has(entry.rvtr) || skip.has(entry.rvtr)) continue;
    seen.add(entry.rvtr);
    out.push(entry.rvtr);
  }
  return out;
}

/** @deprecated */
export function buildBackfillQueue(
  librarySongs: Array<{
    rvtr: string;
    title: string;
    artist: string;
    year: number | null;
    genre: string;
    hasPackage: boolean;
    published: boolean;
    artifactsReady: boolean;
    confidence: number;
    status: string | null;
    playCount?: number;
    hasCover?: boolean;
    retroverseReady?: boolean;
    filePath?: string;
    coverSource?: string | null;
  }>,
): BackfillQueueFile {
  return buildVideoBackfillQueue(
    librarySongs.map((s) => ({
      rvtr: s.rvtr,
      title: s.title,
      artist: s.artist,
      playCount: s.playCount ?? 0,
      priorityScore: (s as { priorityScore?: number }).priorityScore ?? s.playCount ?? 0,
      identifiable: (s as { identifiable?: boolean }).identifiable ?? true,
      researchReady: (s as { researchReady?: boolean }).researchReady ?? true,
      filePath: s.filePath ?? "",
      year: s.year,
      genre: s.genre,
      hasCover: s.hasCover ?? true,
      coverUrl: null,
      coverSource: s.coverSource ?? null,
      hasPackage: s.hasPackage,
      published: s.published,
      artifactsReady: s.artifactsReady,
      retroverseReady: s.retroverseReady ?? false,
      confidence: s.confidence,
      status: s.status,
    })),
  );
}

export function nextQueueRvtrs(queue: BackfillQueueFile, limit: number, skip: Set<string>): string[] {
  return nextPackageQueueRvtrs(queue, limit, skip);
}
