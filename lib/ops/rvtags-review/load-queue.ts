import { readFile } from "fs/promises";

import { pilotCsvPath, reviewedCsvPath } from "./paths";
import { parseRvTagsCsv } from "./csv";
import {
  applyPilotAutoSelect,
  formatRvTags,
  parseRvTagString,
  type RvTagId,
} from "./vocabulary";
import { loadVdjMetaForPaths } from "./vdj-lookup";

export type RvTagsReviewItem = {
  filePath: string;
  artist: string;
  title: string;
  year: number;
  suggestedTags: RvTagId[];
  selectedTags: RvTagId[];
  currentUser2: string;
  playCount: number | null;
  reviewed: boolean;
  reviewedAt: string | null;
};

export type RvTagsReviewQueue = {
  year: number;
  items: RvTagsReviewItem[];
  reviewedCount: number;
  total: number;
  pilotPath: string;
  reviewedPath: string;
};

function normPath(p: string): string {
  return p.replace(/\\/g, "/").trim();
}

export async function loadRvTagsReviewQueue(year: number): Promise<RvTagsReviewQueue> {
  const pilotPath = pilotCsvPath(year);
  const reviewedPath = reviewedCsvPath(year);

  let pilotRaw: string;
  try {
    pilotRaw = await readFile(pilotPath, "utf8");
  } catch {
    throw new Error(`Pilot CSV not found: ${pilotPath}`);
  }

  const pilotRows = parseRvTagsCsv(pilotRaw);
  const reviewedByPath = new Map<string, ReturnType<typeof parseRvTagsCsv>[0]>();

  try {
    const reviewedRaw = await readFile(reviewedPath, "utf8");
    for (const row of parseRvTagsCsv(reviewedRaw)) {
      reviewedByPath.set(normPath(row.filePath), row);
    }
  } catch {
    // no reviewed file yet
  }

  const paths = pilotRows.map((r) => r.filePath);
  const vdjMeta = await loadVdjMetaForPaths(paths);

  const items: RvTagsReviewItem[] = pilotRows.map((row) => {
    const key = normPath(row.filePath);
    const saved = reviewedByPath.get(key);
    const suggested = applyPilotAutoSelect(parseRvTagString(row.rvTags));
    const selected = saved
      ? parseRvTagString(saved.rvTags)
      : suggested;
    const vdj = vdjMeta.get(key);

    return {
      filePath: row.filePath,
      artist: row.artist,
      title: row.title,
      year: row.year || year,
      suggestedTags: suggested,
      selectedTags: selected,
      currentUser2: saved?.currentUser2 ?? vdj?.user2 ?? "",
      playCount: vdj?.playCount ?? null,
      reviewed: Boolean(saved?.reviewedAt),
      reviewedAt: saved?.reviewedAt ?? null,
    };
  });

  const reviewedCount = items.filter((i) => i.reviewed).length;

  return {
    year,
    items,
    reviewedCount,
    total: items.length,
    pilotPath,
    reviewedPath,
  };
}

export type SaveRvTagsReviewInput = {
  year: number;
  filePath: string;
  tags: RvTagId[];
};

export async function saveRvTagsReviewDecision(
  input: SaveRvTagsReviewInput,
): Promise<{ reviewedCount: number; total: number }> {
  const queue = await loadRvTagsReviewQueue(input.year);
  const key = normPath(input.filePath);
  const item = queue.items.find((i) => normPath(i.filePath) === key);
  if (!item) {
    throw new Error("Track not in pilot queue");
  }

  const now = new Date().toISOString();
  const reviewedRows = queue.items.map((row) => {
    const rowKey = normPath(row.filePath);
    const isTarget = rowKey === key;
    const tags = isTarget ? input.tags : row.selectedTags;
    const reviewedAt = isTarget ? now : row.reviewedAt;
    return {
      filePath: row.filePath,
      artist: row.artist,
      title: row.title,
      year: row.year,
      rvTags: formatRvTags(tags),
      reviewedAt: reviewedAt ?? (row.reviewed ? row.reviewedAt : null) ?? undefined,
      suggestedRvTags: formatRvTags(row.suggestedTags),
      currentUser2: row.currentUser2,
    };
  });

  // Only persist rows that have been reviewed at least once
  const toWrite = reviewedRows.filter((r) => r.reviewedAt);
  const { mkdir, writeFile } = await import("fs/promises");
  const { dirname } = await import("path");
  const outPath = reviewedCsvPath(input.year);
  await mkdir(dirname(outPath), { recursive: true });
  const { serializeRvTagsCsv } = await import("./csv");
  await writeFile(outPath, serializeRvTagsCsv(toWrite), "utf8");

  return {
    reviewedCount: toWrite.length,
    total: queue.total,
  };
}
