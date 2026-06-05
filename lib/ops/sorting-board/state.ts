import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type { SortingBoardFile, SortingBucket } from "./types";

const BUCKET_COUNT = 12;

function boardPath(year: number): string {
  return join(opsStateDir(), "sorting-board", `${year}.json`);
}

function defaultBuckets(): SortingBucket[] {
  return Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    id: `bucket-${i + 1}`,
    name: `Group ${i + 1}`,
  }));
}

function emptyBoard(year: number): SortingBoardFile {
  return {
    version: 1,
    year,
    buckets: defaultBuckets(),
    assignments: {},
    updatedAt: new Date().toISOString(),
  };
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
          name:
            typeof b?.name === "string" && b.name.trim()
              ? b.name.trim()
              : `Group ${i + 1}`,
        }))
      : defaultBuckets();

  const assignments: Record<string, string> = {};
  const bucketIds = new Set(buckets.map((b) => b.id));
  for (const [key, bucketId] of Object.entries(obj.assignments ?? {})) {
    if (typeof key !== "string" || !key.trim()) continue;
    if (typeof bucketId !== "string" || !bucketIds.has(bucketId)) continue;
    assignments[key.trim()] = bucketId;
  }

  return {
    version: 1,
    year,
    buckets,
    assignments,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt.trim()
        : new Date().toISOString(),
  };
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
  file.updatedAt = new Date().toISOString();
  await writeFile(boardPath(file.year), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export async function renameSortingBucket(
  year: number,
  bucketId: string,
  name: string,
): Promise<SortingBoardFile> {
  const file = await loadSortingBoardState(year);
  const trimmed = name.trim() || "Untitled";
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
): Promise<SortingBoardFile> {
  const file = await loadSortingBoardState(year);
  const key = workspaceKey.trim();
  if (!key) return file;

  if (bucketId == null) {
    delete file.assignments[key];
  } else {
    const valid = file.buckets.some((b) => b.id === bucketId);
    if (!valid) return file;
    file.assignments[key] = bucketId;
  }

  await saveSortingBoardState(file);
  return file;
}
