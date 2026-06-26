/**
 * Browser+ 2 — thin scheduler adapter over Studio department workers.
 *
 * Maps queue departments to worker registry entries; validates before run.
 */

import "server-only";

import { getStudioExecutionEngine } from "@/lib/ops/studio/workers/execution-engine";

import type { Bp2Row, Bp2StudioQueueDepartment } from "./types";
import { resolveQueueWorker, type QueueWorkerResolution } from "./studio-scheduler-map";

export type { QueueWorkerResolution } from "./studio-scheduler-map";
export { resolveQueueWorker } from "./studio-scheduler-map";

async function buildWorkerPayload(
  resolution: QueueWorkerResolution,
  rvtr: string,
  row: Bp2Row | null,
): Promise<Record<string, unknown> | undefined> {
  if (resolution.workerId !== "collector") return undefined;

  const { resolveCollectorFromBrowserRow } = await import("./resolve-collector-row");
  const resolved = await resolveCollectorFromBrowserRow(rvtr, row);
  return {
    artist: resolved.artist,
    title: resolved.title,
    vdjFilePath: resolved.vdjFilePath,
    graphLinked: resolved.graphLinked,
    performanceHints: resolved.performanceHints,
    notes: resolved.notes,
  };
}

export async function runQueueDepartmentStep(
  department: Bp2StudioQueueDepartment,
  rvtr: string,
  row: Bp2Row | null,
): Promise<{ status: "complete" | "failed" | "skipped"; message: string }> {
  const resolution = resolveQueueWorker(department);
  if (!resolution) {
    return { status: "skipped", message: "Unknown department" };
  }

  const engine = getStudioExecutionEngine();
  const result = await engine.execute({
    workerId: resolution.workerId,
    rvtr,
    action: resolution.action,
    payload: await buildWorkerPayload(resolution, rvtr, row),
  });

  return {
    status: result.status,
    message: result.message,
  };
}
