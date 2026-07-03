import "server-only";

import { readdir, stat } from "fs/promises";
import { join } from "path";

import { researchDepartmentRoot } from "@/lib/studio/package";

const RVTR_DIR = /^RVTR\d{6}$/i;

/** Max packages scanned on dashboard / pipeline paths. */
export const STUDIO_SNAPSHOT_SCAN_LIMIT = 200;

/** Max packages loaded into department library cards on first paint. */
export const STUDIO_LIBRARY_CARD_LIMIT = 150;

export type ListRvtrOptions = {
  limit?: number;
  /** When true, sort by directory mtime (newest first). */
  recentFirst?: boolean;
};

export async function listRvtrDirectories(options: ListRvtrOptions = {}): Promise<{
  rvtrs: string[];
  total: number;
  truncated: boolean;
}> {
  const root = researchDepartmentRoot();
  const limit = options.limit;
  const recentFirst = options.recentFirst ?? Boolean(limit);

  try {
    const entries = await readdir(root, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && RVTR_DIR.test(e.name))
      .map((e) => e.name.toUpperCase());

    if (!recentFirst || !limit || dirs.length <= limit) {
      const rvtrs = limit ? dirs.slice(0, limit) : dirs;
      return { rvtrs, total: dirs.length, truncated: Boolean(limit && dirs.length > limit) };
    }

    const withMtime = await Promise.all(
      dirs.map(async (rvtr) => {
        try {
          const s = await stat(join(root, rvtr));
          return { rvtr, mtime: s.mtimeMs };
        } catch {
          return { rvtr, mtime: 0 };
        }
      }),
    );

    withMtime.sort((a, b) => b.mtime - a.mtime);
    const rvtrs = withMtime.slice(0, limit).map((r) => r.rvtr);
    return { rvtrs, total: dirs.length, truncated: dirs.length > limit };
  } catch {
    return { rvtrs: [], total: 0, truncated: false };
  }
}

/** Process items in fixed-size parallel batches. */
export async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const chunk = await Promise.all(batch.map(fn));
    results.push(...chunk);
  }
  return results;
}
