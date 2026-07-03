import "server-only";

import { access } from "fs/promises";

import { loadBrowserPlus2Model } from "@/lib/ops/browser-plus-2/load-browser-plus-2";
import { isActiveVideoRow } from "@/lib/ops/browser-plus-2/status";
import { collectorOutputPath } from "./paths";
import type { ResolvedCollectorSong } from "./pilot-songs";
import { loadCollectorPackage } from "./store";

export type CollectorOvernightQueueOptions = {
  /** Max songs to enqueue (0 = unlimited). */
  limit: number;
  /** Re-run packages that already exist but lack lyrics. */
  refreshMissingLyrics: boolean;
  /** Re-run all eligible songs regardless of existing package. */
  force: boolean;
};

export type CollectorOvernightCandidate = ResolvedCollectorSong & {
  playCount: number;
  reason: "missing_package" | "missing_lyrics" | "forced";
};

async function packageNeedsRun(
  rvtr: string,
  options: Pick<CollectorOvernightQueueOptions, "refreshMissingLyrics" | "force">,
): Promise<"skip" | "missing_package" | "missing_lyrics"> {
  if (options.force) return "missing_package";

  try {
    await access(collectorOutputPath(rvtr));
  } catch {
    return "missing_package";
  }

  if (!options.refreshMissingLyrics) return "skip";

  const pkg = await loadCollectorPackage(rvtr);
  if (!pkg?.lyrics?.available) return "missing_lyrics";
  return "skip";
}

/** Select video library rows for unattended Collector overnight runs. */
export async function selectCollectorOvernightQueue(
  options: CollectorOvernightQueueOptions,
): Promise<CollectorOvernightCandidate[]> {
  const model = await loadBrowserPlus2Model();
  const seen = new Set<string>();
  const candidates: CollectorOvernightCandidate[] = [];

  const rows = [...model.rows]
    .filter((row) => row.rvtr && isActiveVideoRow(row) && row.filePath?.trim())
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));

  for (const row of rows) {
    if (options.limit > 0 && candidates.length >= options.limit) break;

    const rvtr = row.rvtr!.trim().toUpperCase();
    if (seen.has(rvtr)) continue;
    seen.add(rvtr);

    const need = await packageNeedsRun(rvtr, options);
    if (need === "skip") continue;

    candidates.push({
      rvtr,
      artist: row.artist,
      title: row.title,
      graphLinked: true,
      vdjFilePath: row.filePath ?? null,
      performanceHints: [],
      notes: ["Overnight Collector queue"],
      playCount: row.playCount ?? 0,
      reason: need === "missing_lyrics" ? "missing_lyrics" : options.force ? "forced" : "missing_package",
    });
  }

  return candidates;
}
