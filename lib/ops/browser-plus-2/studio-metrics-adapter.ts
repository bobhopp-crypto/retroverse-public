/**
 * Browser+ 2 — thin adapter over Studio Kernel metrics helpers.
 */

import {
  buildStudioHealthCounts,
  type StudioHealthCounts,
  type StudioHealthRowInput,
} from "@/lib/studio/metrics";

import type { Bp2Row, Bp2StudioHealth } from "./types";

export type { StudioHealthCounts, StudioHealthRowInput } from "@/lib/studio/metrics";

export {
  averagePatronValue,
  buildStudioHealthCounts,
  completionPct,
  isDirectorReady,
  studioHealthCountsToSnapshot,
} from "@/lib/studio/metrics";

/** @deprecated Use `completionPct` from kernel — alias preserved for BP2 readiness. */
export { completionPct as readinessPct } from "@/lib/studio/metrics";

export function bp2RowToHealthInput(row: Bp2Row): StudioHealthRowInput {
  return { rvtr: row.rvtr, studio: row.studio };
}

export function buildBp2StudioHealth(videoRows: Bp2Row[]): Bp2StudioHealth {
  return buildStudioHealthCounts(videoRows.length, videoRows.map(bp2RowToHealthInput));
}
