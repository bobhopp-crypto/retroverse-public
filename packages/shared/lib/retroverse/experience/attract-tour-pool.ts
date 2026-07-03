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

const ATTRACT_PUBLISHED_POOL_PATH = `${process.cwd()}/data/ops/studio/attract-tour-published-pool.json`;

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

type BundledPublishedPoolEntry = {
  rvtr: string;
  title: string;
  artist: string;
  year: number;
  era: StudioEraAnchor;
  coverUrl: string | null;
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

function toAttractTourEntry(input: {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  coverUrl?: string | null;
}): AttractTourEntry {
  return {
    rvtr: input.rvtr,
    title: input.title,
    artist: input.artist,
    playCount: 0,
    experienceReady: true,
    researchComplete: true,
    hasCover: Boolean(input.coverUrl),
    storyScore: 8,
    releaseYear: input.year,
    score: 1000,
  };
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

async function loadBundledPublishedPool(): Promise<BundledPublishedPoolEntry[]> {
  const parsed = await readJsonFileSafe<{ entries?: BundledPublishedPoolEntry[] } | null>(
    ATTRACT_PUBLISHED_POOL_PATH,
    null,
  );
  if (!Array.isArray(parsed?.entries)) return [];
  return parsed.entries.filter(
    (entry) =>
      entry.rvtr &&
      entry.title &&
      entry.artist &&
      ATTRACT_ERA_ANCHORS.includes(entry.era) &&
      typeof entry.year === "number",
  );
}

async function buildFromPublisherStore(): Promise<AttractTourEntry[]> {
  const store = await loadPublisherStore();
  const byEra: Record<StudioEraAnchor, AttractTourEntry[]> = {
    1980: [],
    1990: [],
    2005: [],
  };

  const approved = store.records.filter((record) => isPublisherApproved(record));
  if (approved.length === 0) return [];

  const resolved = await Promise.all(
    approved.map(async (record) => ({
      record,
      year: await readCollectorYear(record.rvtr),
    })),
  );

  for (const { record, year } of resolved) {
    const era = eraAnchorForYear(year);
    if (!era || !ATTRACT_ERA_ANCHORS.includes(era)) continue;

    byEra[era].push(
      toAttractTourEntry({
        rvtr: record.rvtr,
        title: record.title,
        artist: record.artist,
        year,
        coverUrl: record.coverUrl,
      }),
    );
  }

  return ATTRACT_ERA_ANCHORS.flatMap((era) => byEra[era]);
}

function buildFromBundledPool(entries: BundledPublishedPoolEntry[]): AttractTourEntry[] {
  return entries.map((entry) =>
    toAttractTourEntry({
      rvtr: entry.rvtr,
      title: entry.title,
      artist: entry.artist,
      year: entry.year,
      coverUrl: entry.coverUrl,
    }),
  );
}

/** Rotating attract pool — published experiences from 1980, 1990, and 2005 eras. */
export async function buildAttractTourPool(sessionSeed: number): Promise<{
  seed: number;
  entries: AttractTourEntry[];
}> {
  const [dynamicEntries, bundledPool] = await Promise.all([
    buildFromPublisherStore(),
    loadBundledPublishedPool(),
  ]);

  const bundledEntries = buildFromBundledPool(bundledPool);
  const source =
    dynamicEntries.length > bundledEntries.length ? dynamicEntries : bundledEntries;

  const byEra: Record<StudioEraAnchor, AttractTourEntry[]> = {
    1980: [],
    1990: [],
    2005: [],
  };

  for (const entry of source) {
    const era = eraAnchorForYear(entry.releaseYear);
    if (!era || !ATTRACT_ERA_ANCHORS.includes(era)) continue;
    byEra[era].push(entry);
  }

  return {
    seed: sessionSeed,
    entries: interleaveEraPools(byEra, sessionSeed),
  };
}
