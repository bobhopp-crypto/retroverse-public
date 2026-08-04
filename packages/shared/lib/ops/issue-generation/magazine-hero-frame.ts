import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { resolveIssueStateDirs } from "@/lib/ops/issue-generation-monitor";

import {
  isMagazineHomepageBenchmark,
  MAGAZINE_BENCHMARK_RVTR,
} from "@/lib/ops/issue-generation/magazine-homepage-benchmark";

export type MagazineHeroFrameRecord = {
  path: string;
  sourcePath: string;
  timestamp: number;
  sha256: string;
  reason: string;
  sourceVideoPath?: string;
  selectedAt: string;
};

export type MagazineHeroFrameCandidate = {
  id: string;
  filename: string;
  path: string;
  timestamp: number | null;
  score: number | null;
  selected: boolean;
  previewHref: string;
};

type StoredJob = {
  rvtr?: string;
  source?: string;
  status?: string;
  updatedAt?: string;
  magazineHeroFrame?: MagazineHeroFrameRecord;
  frameSelection?: {
    selectedTimestamps?: number[];
    selectedFramePaths?: string[];
    selectedScores?: number[];
    contactSheetPath?: string;
  };
};

type StoredState = { updatedAt?: string; jobs?: Record<string, StoredJob> };

export { isMagazineHomepageBenchmark, MAGAZINE_BENCHMARK_RVTR };

async function sha256File(path: string): Promise<string> {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

function framesDirFor(stateDir: string, rvtr: string): string {
  return join(stateDir, "frames", rvtr.toUpperCase());
}

async function writeMetaSidecar(record: MagazineHeroFrameRecord): Promise<void> {
  const dir = join(record.path, "..");
  const metaPath = join(dir, "magazine-hero-meta.json");
  await writeFile(metaPath, `${JSON.stringify(record, null, 2)}\n`);
}

function defaultHeroForJob(job: StoredJob, stateDir: string, rvtr: string): MagazineHeroFrameRecord | null {
  const selectedPaths = job.frameSelection?.selectedFramePaths ?? [];
  const timestamps = job.frameSelection?.selectedTimestamps ?? [];
  const path = selectedPaths[0] ?? join(framesDirFor(stateDir, rvtr), "selected-01.jpg");
  if (!existsSync(path)) return null;
  return {
    path,
    sourcePath: path,
    timestamp: typeof timestamps[0] === "number" ? timestamps[0] : 0,
    sha256: "",
    reason:
      "Highest-scored landscape frame; full performer and stage visible; no transition, black frame, or extreme crop.",
    sourceVideoPath: typeof job.source === "string" ? job.source : undefined,
    selectedAt: new Date().toISOString(),
  };
}

async function findJobEntry(
  rvtr: string,
): Promise<{ stateDir: string; jobKey: string; job: StoredJob; state: StoredState; statePath: string } | null> {
  for (const stateDir of resolveIssueStateDirs()) {
    const statePath = join(stateDir, "state.json");
    if (!existsSync(statePath)) continue;
    try {
      const state = JSON.parse(await readFile(statePath, "utf8")) as StoredState;
      const entry = Object.entries(state.jobs ?? {}).find(([, job]) => job.rvtr?.toUpperCase() === rvtr);
      if (entry) {
        return { stateDir, jobKey: entry[0], job: entry[1], state, statePath };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function ensureMagazineHeroFrame(rvtr: string): Promise<MagazineHeroFrameRecord | null> {
  if (!isMagazineHomepageBenchmark(rvtr)) return null;
  const found = await findJobEntry(rvtr.toUpperCase());
  if (!found) return null;

  let record = found.job.magazineHeroFrame;
  if (!record || !existsSync(record.path)) {
    const fallback = defaultHeroForJob(found.job, found.stateDir, rvtr);
    if (!fallback) return null;
    fallback.sha256 = await sha256File(fallback.path);
    record = fallback;
    found.job.magazineHeroFrame = record;
    found.state.updatedAt = new Date().toISOString();
    await writeFile(found.statePath, `${JSON.stringify(found.state, null, 2)}\n`);
    await writeMetaSidecar(record);
  } else if (!record.sha256) {
    record.sha256 = await sha256File(record.path);
  }

  return record;
}

export async function resolveMagazineHeroFramePath(rvtr: string): Promise<string | null> {
  const record = await ensureMagazineHeroFrame(rvtr);
  return record?.path && existsSync(record.path) ? record.path : null;
}

export async function listMagazineHeroFrameCandidates(rvtr: string): Promise<MagazineHeroFrameCandidate[]> {
  if (!isMagazineHomepageBenchmark(rvtr)) return [];
  const found = await findJobEntry(rvtr.toUpperCase());
  if (!found) return [];

  const frameDir = framesDirFor(found.stateDir, rvtr);
  if (!existsSync(frameDir)) return [];

  const current = found.job.magazineHeroFrame?.path ?? null;
  const selectedPaths = new Set(found.job.frameSelection?.selectedFramePaths ?? []);
  const timestamps = found.job.frameSelection?.selectedTimestamps ?? [];
  const scores = found.job.frameSelection?.selectedScores ?? [];
  const selectedIndex = new Map(
    (found.job.frameSelection?.selectedFramePaths ?? []).map((path, index) => [path, index]),
  );

  const names = (await readdir(frameDir))
    .filter((name) => /^(candidate|selected)-\d+\.jpg$/i.test(name))
    .sort((a, b) => {
      const aSelected = a.startsWith("selected-");
      const bSelected = b.startsWith("selected-");
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

  return names.map((filename) => {
    const path = join(frameDir, filename);
    const selectedIdx = selectedIndex.get(path);
    return {
      id: basename(filename, ".jpg"),
      filename,
      path,
      timestamp: typeof selectedIdx === "number" ? (timestamps[selectedIdx] ?? null) : null,
      score: typeof selectedIdx === "number" ? (scores[selectedIdx] ?? null) : null,
      selected: current === path || selectedPaths.has(path),
      previewHref: `/api/ops/issue-generation/hero-frame?rvtr=${rvtr.toUpperCase()}&candidate=${encodeURIComponent(filename)}`,
    };
  });
}

export async function selectMagazineHeroFrame(
  rvtr: string,
  framePath: string,
  reason?: string,
): Promise<MagazineHeroFrameRecord | null> {
  if (!isMagazineHomepageBenchmark(rvtr)) return null;
  if (!existsSync(framePath)) return null;

  const found = await findJobEntry(rvtr.toUpperCase());
  if (!found) return null;

  const frameDir = framesDirFor(found.stateDir, rvtr);
  if (!framePath.startsWith(frameDir)) return null;

  const selectedPaths = found.job.frameSelection?.selectedFramePaths ?? [];
  const timestamps = found.job.frameSelection?.selectedTimestamps ?? [];
  const idx = selectedPaths.indexOf(framePath);
  const timestamp = idx >= 0 ? (timestamps[idx] ?? 0) : 0;

  const record: MagazineHeroFrameRecord = {
    path: framePath,
    sourcePath: framePath,
    timestamp,
    sha256: await sha256File(framePath),
    reason:
      reason?.trim() ||
      (idx >= 0
        ? "Operator selected from ranked source frames."
        : "Operator selected alternate candidate frame."),
    sourceVideoPath: typeof found.job.source === "string" ? found.job.source : undefined,
    selectedAt: new Date().toISOString(),
  };

  found.job.magazineHeroFrame = record;
  found.job.updatedAt = new Date().toISOString();
  found.state.updatedAt = found.job.updatedAt;
  await writeFile(found.statePath, `${JSON.stringify(found.state, null, 2)}\n`);
  await writeMetaSidecar(record);
  return record;
}

export async function resolveCandidateFramePath(rvtr: string, candidateFilename: string): Promise<string | null> {
  const found = await findJobEntry(rvtr.toUpperCase());
  if (!found) return null;
  const safe = basename(candidateFilename);
  if (!/^(candidate|selected)-\d+\.jpg$/i.test(safe)) return null;
  const path = join(framesDirFor(found.stateDir, rvtr), safe);
  return existsSync(path) ? path : null;
}
