import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { randomUUID } from "crypto";

import { bundledIntelligenceRoot } from "@/lib/ops/intelligence/paths";
import { normalizeRvtr } from "@/lib/studio/status";

import type {
  DirectorCoachingStore,
  DirectorExhibitCoachingRecord,
  DirectorPlanSnapshot,
  ExhibitCoachingVerdict,
} from "./types";

function coachingStorePath(): string {
  return join(bundledIntelligenceRoot(), "..", "studio", "director-coaching.json");
}

function emptyStore(): DirectorCoachingStore {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    exhibitCoaching: [],
    planSnapshots: [],
  };
}

export async function loadDirectorCoachingStore(): Promise<DirectorCoachingStore> {
  try {
    const raw = await readFile(coachingStorePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<DirectorCoachingStore>;
    return {
      ...emptyStore(),
      ...parsed,
      exhibitCoaching: Array.isArray(parsed.exhibitCoaching) ? parsed.exhibitCoaching : [],
      planSnapshots: Array.isArray(parsed.planSnapshots) ? parsed.planSnapshots : [],
    };
  } catch {
    return emptyStore();
  }
}

async function saveDirectorCoachingStore(store: DirectorCoachingStore): Promise<void> {
  const path = coachingStorePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export async function saveExhibitCoaching(input: {
  rvtr: string;
  exhibitId: string;
  verdict: ExhibitCoachingVerdict;
  reasons: string[];
  note?: string | null;
  frameAssetId?: string | null;
  frameCategory?: string | null;
  source?: DirectorExhibitCoachingRecord["source"];
}): Promise<DirectorExhibitCoachingRecord> {
  const normalized = normalizeRvtr(input.rvtr);
  if (!normalized) throw new Error("invalid_rvtr");

  const store = await loadDirectorCoachingStore();
  const record: DirectorExhibitCoachingRecord = {
    id: randomUUID(),
    rvtr: normalized,
    exhibitId: input.exhibitId,
    verdict: input.verdict,
    reasons: input.reasons.filter(Boolean),
    note: input.note?.trim() || null,
    frameAssetId: input.frameAssetId ?? null,
    frameCategory: input.frameCategory ?? null,
    coachedAt: new Date().toISOString(),
    source: input.source ?? "operator",
  };

  store.exhibitCoaching = store.exhibitCoaching.filter(
    (r) => !(r.rvtr === normalized && r.exhibitId === input.exhibitId && r.source === record.source),
  );
  store.exhibitCoaching.push(record);
  store.exhibitCoaching = store.exhibitCoaching.slice(-2000);
  await saveDirectorCoachingStore(store);
  return record;
}

export async function listExhibitCoachingForRvtr(rvtr: string): Promise<DirectorExhibitCoachingRecord[]> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return [];
  const store = await loadDirectorCoachingStore();
  return store.exhibitCoaching.filter((r) => r.rvtr === normalized);
}

export async function archiveDirectorPlanSnapshot(input: {
  rvtr: string;
  generatedAt: string;
  sceneCount: number;
  experiencePlan: unknown;
}): Promise<void> {
  const normalized = normalizeRvtr(input.rvtr);
  if (!normalized) return;

  const store = await loadDirectorCoachingStore();
  const snapshot: DirectorPlanSnapshot = {
    rvtr: normalized,
    savedAt: new Date().toISOString(),
    generatedAt: input.generatedAt,
    sceneCount: input.sceneCount,
    experiencePlan: input.experiencePlan,
  };

  store.planSnapshots = store.planSnapshots.filter((s) => s.rvtr !== normalized);
  store.planSnapshots.unshift(snapshot);
  store.planSnapshots = store.planSnapshots.slice(0, 500);
  await saveDirectorCoachingStore(store);
}

export async function getPreviousPlanSnapshot(rvtr: string): Promise<DirectorPlanSnapshot | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;
  const store = await loadDirectorCoachingStore();
  return store.planSnapshots.find((s) => s.rvtr === normalized) ?? null;
}

export async function listAllCoachingRecords(): Promise<DirectorExhibitCoachingRecord[]> {
  const store = await loadDirectorCoachingStore();
  return store.exhibitCoaching;
}
