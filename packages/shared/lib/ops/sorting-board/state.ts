import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import {
  emptyBucketOrder,
  insertIntoBucketOrder,
  removeFromAllBucketOrders,
  syncBucketOrder,
} from "./order";
import type { SortingBoardFile, SortingBucket } from "./types";

const BUCKET_COUNT = 12;

function boardPath(year: number): string {
  return join(opsStateDir(), "sorting-board", `${year}.json`);
}

function defaultBuckets(): SortingBucket[] {
  return Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    id: `bucket-${i + 1}`,
    name: "",
  }));
}

function emptyBoard(year: number): SortingBoardFile {
  const buckets = defaultBuckets();
  return {
    version: 1,
    year,
    buckets,
    assignments: {},
    bucketOrder: emptyBucketOrder(buckets),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeBucketOrder(
  raw: unknown,
  buckets: SortingBucket[],
): Record<string, string[]> {
  const order = emptyBucketOrder(buckets);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return order;
  const bucketIds = new Set(buckets.map((b) => b.id));
  for (const [id, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!bucketIds.has(id) || !Array.isArray(list)) continue;
    order[id] = list
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim());
  }
  return order;
}

function normalizeBoard(raw: unknown, year: number): SortingBoardFile {
  if (!raw || typeof raw !== "object") return emptyBoard(year);
  const obj = raw as Partial<SortingBoardFile>;
  const buckets =
    Array.isArray(obj.buckets) && obj.buckets.length === BUCKET_COUNT
      ? obj.buckets.map((b, i) => ({
          id:
            typeof b?.id === "string" && b.id.trim()
              ? b.id.trim()
              : `bucket-${i + 1}`,
          name: typeof b?.name === "string" ? b.name : "",
        }))
      : defaultBuckets();

  const assignments: Record<string, string> = {};
  const bucketIds = new Set(buckets.map((b) => b.id));
  for (const [key, bucketId] of Object.entries(obj.assignments ?? {})) {
    if (typeof key !== "string" || !key.trim()) continue;
    if (typeof bucketId !== "string" || !bucketIds.has(bucketId)) continue;
    assignments[key.trim()] = bucketId;
  }

  const file: SortingBoardFile = {
    version: 1,
    year,
    buckets,
    assignments,
    bucketOrder: normalizeBucketOrder(obj.bucketOrder, buckets),
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt.trim()
        : new Date().toISOString(),
  };
  syncBucketOrder(file);
  return file;
}

export async function loadSortingBoardState(year: number): Promise<SortingBoardFile> {
  try {
    const raw = await readFile(boardPath(year), "utf8");
    return normalizeBoard(JSON.parse(raw) as unknown, year);
  } catch {
    return emptyBoard(year);
  }
}

export async function saveSortingBoardState(file: SortingBoardFile): Promise<void> {
  const dir = join(opsStateDir(), "sorting-board");
  await mkdir(dir, { recursive: true });
  syncBucketOrder(file);
  file.updatedAt = new Date().toISOString();
  await writeFile(boardPath(file.year), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export async function renameSortingBucket(
  year: number,
  bucketId: string,
  name: string,
): Promise<SortingBoardFile> {
  const file = await loadSortingBoardState(year);
  const trimmed = name.trim();
  if (!trimmed) return file;
  file.buckets = file.buckets.map((b) =>
    b.id === bucketId ? { ...b, name: trimmed } : b,
  );
  await saveSortingBoardState(file);
  return file;
}

export async function assignSortingSong(
  year: number,
  workspaceKey: string,
  bucketId: string | null,
  insertBefore: string | null = null,
): Promise<SortingBoardFile> {
  const file = await loadSortingBoardState(year);
  const key = workspaceKey.trim();
  if (!key) return file;

  removeFromAllBucketOrders(file.bucketOrder, key);

  if (bucketId == null) {
    delete file.assignments[key];
  } else {
    const valid = file.buckets.some((b) => b.id === bucketId);
    if (!valid) return file;
    file.assignments[key] = bucketId;
    const order = file.bucketOrder[bucketId] ?? [];
    file.bucketOrder[bucketId] = insertIntoBucketOrder(order, key, insertBefore);
  }

  await saveSortingBoardState(file);
  return file;
}

export async function setBucketOrder(
  year: number,
  bucketId: string,
  order: string[],
): Promise<SortingBoardFile> {
  const file = await loadSortingBoardState(year);
  if (!file.buckets.some((b) => b.id === bucketId)) return file;

  const assigned = new Set(
    Object.entries(file.assignments)
      .filter(([, b]) => b === bucketId)
      .map(([k]) => k),
  );

  const next: string[] = [];
  for (const k of order) {
    if (assigned.has(k) && !next.includes(k)) next.push(k);
  }
  for (const k of assigned) {
    if (!next.includes(k)) next.push(k);
  }

  file.bucketOrder[bucketId] = next;
  await saveSortingBoardState(file);
  return file;
}
