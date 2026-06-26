import "server-only";

import type { Bp2Row } from "./types";

import type { ResolvedCollectorSong } from "@/lib/ops/studio/collector/pilot-songs";

/** Resolve Collector input from Browser+ row — thin orchestration, no research logic. */
export async function resolveCollectorFromBrowserRow(
  rvtr: string,
  row: Bp2Row | null,
): Promise<ResolvedCollectorSong> {
  const normalized = rvtr.trim().toUpperCase();
  return {
    rvtr: normalized,
    artist: row?.artist ?? "Unknown Artist",
    title: row?.title ?? "Unknown Title",
    graphLinked: true,
    vdjFilePath: row?.filePath ?? null,
    performanceHints: [],
    notes: row ? ["Queued from Browser+ Studio Operations Center"] : [],
  };
}
