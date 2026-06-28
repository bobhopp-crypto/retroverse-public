import "server-only";

import { existsSync } from "fs";
import { open } from "fs/promises";

import { collectorOutputPath } from "@/lib/ops/studio/collector/paths";
import {
  eraAnchorForYear,
  type StudioEraAnchor,
} from "@/lib/ops/studio/production/filter-by-era";
import {
  isPublisherApproved,
  loadPublisherStore,
} from "@/lib/ops/studio/publisher/store";
import { readJsonFileSafe } from "@/lib/ops/studio/safe-io";

const ATTRACT_ERA_YEARS_PATH = `${process.cwd()}/data/ops/studio/attract-tour-era-years.json`;

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

const ATTRACT_ERA_ANCHORS: StudioEraAnchor[] = [1980, 1990, 2005];

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

async function loadAttractTourEraYears(): Promise<Map<string, number>> {
  const parsed = await readJsonFileSafe<{ years?: Record<string, number> } | null>(
    ATTRACT_ERA_YEARS_PATH,
    null,
  );
  const years = parsed?.years ?? {};
  return new Map(
    Object.entries(years).flatMap(([rvtr, year]) =>
      typeof year === "number" && year >= 1960 && year <= 2030 ? [[rvtr, year] as const] : [],
    ),
  );
}

async function readCollectorYear(rvtr: string): Promise<number | null> {
  const path = collectorOutputPath(rvtr);
  if (!existsSync(path)) return null;
  try {
    const fd = await open(path, "r");
    const buf = Buffer.alloc(2048);
    await fd.read(buf, 0, 2048, 0);
    await fd.close();
    const match = buf
      .toString("utf8")
      .match(/"identity"\s*:\s*\{\s*"rvtr"[\s\S]*?"year"\s*:\s*(\d{4})/);
    if (!match) return null;
    const year = Number.parseInt(match[1]!, 10);
    return year >= 1960 && year <= 2030 ? year : null;
  } catch {
    return null;
  }
}

async function resolveSongYear(
  rvtr: string,
  bundledYears: Map<string, number>,
): Promise<number | null> {
  const fromCollector = await readCollectorYear(rvtr);
  if (fromCollector != null) return fromCollector;
  return bundledYears.get(rvtr) ?? null;
}

function interleaveEraPools(
  byEra: Record<StudioEraAnchor, AttractTourEntry[]>,
  seed: number,
): AttractTourEntry[] {
  const buckets = ATTRACT_ERA_ANCHORS.map((era) => ({
    era,
    items: seededShuffle(byEra[era], seed + era),
  })).filter((bucket) => bucket.items.length > 0);

  const entries: AttractTourEntry[] = [];
  let index = 0;
  while (true) {
    let added = false;
    for (const bucket of buckets) {
      const entry = bucket.items[index];
      if (entry) {
        entries.push(entry);
        added = true;
      }
    }
    if (!added) break;
    index += 1;
  }
  return entries;
}

/** Rotating attract pool — published experiences from 1980, 1990, and 2005 eras. */
export async function buildAttractTourPool(sessionSeed: number): Promise<{
  seed: number;
  entries: AttractTourEntry[];
}> {
  const [store, bundledYears] = await Promise.all([
    loadPublisherStore(),
    loadAttractTourEraYears(),
  ]);
  const byEra: Record<StudioEraAnchor, AttractTourEntry[]> = {
    1980: [],
    1990: [],
    2005: [],
  };

  const approved = store.records.filter((record) => isPublisherApproved(record));
  const resolved = await Promise.all(
    approved.map(async (record) => ({
      record,
      year: await resolveSongYear(record.rvtr, bundledYears),
    })),
  );

  for (const { record, year } of resolved) {
    const era = eraAnchorForYear(year);
    if (!era || !ATTRACT_ERA_ANCHORS.includes(era)) continue;

    byEra[era].push({
      rvtr: record.rvtr,
      title: record.title,
      artist: record.artist,
      playCount: 0,
      experienceReady: true,
      researchComplete: true,
      hasCover: Boolean(record.coverUrl),
      storyScore: 8,
      releaseYear: year,
      score: 1000,
    });
  }

  return {
    seed: sessionSeed,
    entries: interleaveEraPools(byEra, sessionSeed),
  };
}
