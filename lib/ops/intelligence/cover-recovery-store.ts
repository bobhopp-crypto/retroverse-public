import { mkdir, readFile, writeFile } from "fs/promises";

import { coverRecoveryQueuePath } from "./paths";
import {
  buildRecoverySummary,
  recoverCoverForTrack,
  type CoverRecoveryEntry,
  type CoverRecoveryQueueFile,
} from "./cover-recovery-queue";
import { loadTopPlayedBackfill } from "./top-played-backfill";

function emptyQueue(): CoverRecoveryQueueFile {
  return {
    version: 1,
    scope: "top100",
    updatedAt: new Date().toISOString(),
    entries: [],
    summary: { total: 0, recovered: 0, reviewNeeded: 0, failed: 0 },
  };
}

export async function loadCoverRecoveryQueue(): Promise<CoverRecoveryQueueFile> {
  try {
    const raw = await readFile(coverRecoveryQueuePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CoverRecoveryQueueFile>;
    if (!Array.isArray(parsed.entries)) return emptyQueue();
    return {
      version: 1,
      scope: parsed.scope === "video-factory" ? "video-factory" : "top100",
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      entries: parsed.entries,
      summary: parsed.summary ?? buildRecoverySummary(parsed.entries),
    };
  } catch {
    return emptyQueue();
  }
}

export async function saveCoverRecoveryQueue(file: CoverRecoveryQueueFile): Promise<void> {
  await mkdir(coverRecoveryQueuePath().replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(
    coverRecoveryQueuePath(),
    `${JSON.stringify({ ...file, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

/** Map RVTR → auto-recovered cover URL (recovered outcome only). */
export async function loadAutoRecoveredCovers(): Promise<
  Map<string, { coverUrl: string; coverSource: string; confidence: number }>
> {
  const queue = await loadCoverRecoveryQueue();
  const out = new Map<string, { coverUrl: string; coverSource: string; confidence: number }>();
  for (const entry of queue.entries) {
    if (entry.outcome !== "recovered" || !entry.coverUrl) continue;
    out.set(entry.rvtr.toUpperCase(), {
      coverUrl: entry.coverUrl,
      coverSource: entry.coverSource ?? "Cover Recovery",
      confidence: entry.confidence,
    });
  }
  return out;
}

export type CoverRecoveryRunResult = {
  queue: CoverRecoveryQueueFile;
  before: { coverPct: number; missingCovers: number };
  after: { coverPct: number; missingCovers: number };
};

/** Run automated cover recovery on Top 100 missing-cover tracks. */
export async function runCoverRecoveryQueue(options?: {
  cohort?: number;
  skipExternal?: boolean;
}): Promise<CoverRecoveryRunResult> {
  const cohort = options?.cohort ?? 100;
  const beforeData = await loadTopPlayedBackfill();
  const missing = beforeData.coverCompletionQueue.slice(0, cohort);

  const entries: CoverRecoveryEntry[] = [];
  for (let i = 0; i < missing.length; i++) {
    const track = missing[i]!;
    if (i > 0 && !options?.skipExternal) await new Promise((r) => setTimeout(r, 300));
    entries.push(await recoverCoverForTrack(track, { skipExternal: options?.skipExternal }));
  }

  const queue: CoverRecoveryQueueFile = {
    version: 1,
    scope: "top100",
    updatedAt: new Date().toISOString(),
    entries,
    summary: buildRecoverySummary(entries),
  };
  await saveCoverRecoveryQueue(queue);

  const afterData = await loadTopPlayedBackfill();
  return {
    queue,
    before: {
      coverPct: beforeData.top100.coverPct,
      missingCovers: beforeData.top100.missingCovers,
    },
    after: {
      coverPct: afterData.top100.coverPct,
      missingCovers: afterData.top100.missingCovers,
    },
  };
}
