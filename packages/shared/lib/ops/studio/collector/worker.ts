import "server-only";

import {
  blockedWorkerResult,
  defineDepartmentWorker,
  failedWorkerResult,
  resolveWorkerAction,
  type DepartmentWorkerRunInput,
  type DepartmentWorkerRunResult,
  type DepartmentWorkerStatusResult,
  type DepartmentWorkerValidation,
} from "@/lib/studio/worker";
import { isValidRvtr, normalizeRvtr } from "@/lib/studio/status";

import type { ResolvedCollectorSong } from "./pilot-songs";
import { artifactExists, departmentArtifactStatus } from "../workers/artifact-status";

const CAPABILITIES = ["run"] as const;
const DEFAULT_ACTION = "run";

async function resolveCollectorInput(
  rvtr: string,
  payload?: Record<string, unknown>,
): Promise<ResolvedCollectorSong> {
  const normalized = normalizeRvtr(rvtr)!;
  const artist =
    typeof payload?.artist === "string" && payload.artist.trim()
      ? payload.artist.trim()
      : null;
  const title =
    typeof payload?.title === "string" && payload.title.trim() ? payload.title.trim() : null;
  const vdjFilePath =
    typeof payload?.vdjFilePath === "string" ? payload.vdjFilePath : null;

  if (artist && title) {
    return {
      rvtr: normalized,
      artist,
      title,
      graphLinked: payload?.graphLinked !== false,
      vdjFilePath,
      performanceHints: Array.isArray(payload?.performanceHints)
        ? payload.performanceHints.filter((v): v is string => typeof v === "string")
        : [],
      notes:
        Array.isArray(payload?.notes) && payload.notes.length > 0
          ? payload.notes.filter((v): v is string => typeof v === "string")
          : ["Resolved via Collector worker payload"],
    };
  }

  const { loadSongMetadata } = await import("@/lib/ops/intelligence/load-song-metadata");
  const metadata = await loadSongMetadata(normalized);
  if (metadata) {
    return {
      rvtr: normalized,
      artist: metadata.artist,
      title: metadata.title,
      graphLinked: true,
      vdjFilePath,
      performanceHints: [],
      notes: ["Resolved via Collector worker metadata"],
    };
  }

  return {
    rvtr: normalized,
    artist: "Unknown Artist",
    title: "Unknown Title",
    graphLinked: false,
    vdjFilePath,
    performanceHints: [],
    notes: ["Collector worker — metadata not found"],
  };
}

async function validate(input: {
  rvtr: string;
  action?: string;
}): Promise<DepartmentWorkerValidation> {
  if (!isValidRvtr(input.rvtr)) {
    return { ok: false, status: "blocked", blockers: ["Invalid RVTR"] };
  }
  return { ok: true, status: "ready", blockers: [] };
}

async function status(rvtr: string): Promise<DepartmentWorkerStatusResult> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) {
    return { status: "blocked", detail: "Invalid RVTR", artifactsPresent: {} };
  }
  const artifactsPresent = await departmentArtifactStatus(normalized, "collector");
  const hasOutput = artifactsPresent.collector === true;
  return {
    status: hasOutput ? "complete" : "idle",
    detail: hasOutput ? "Collector package on disk" : "No collector package",
    artifactsPresent,
  };
}

async function run(input: DepartmentWorkerRunInput): Promise<DepartmentWorkerRunResult> {
  const normalized = normalizeRvtr(input.rvtr);
  const action = resolveWorkerAction(
    { defaultAction: DEFAULT_ACTION, capabilities: [...CAPABILITIES] },
    input.action,
  );
  if (!normalized) {
    return blockedWorkerResult(input.rvtr, action, ["Invalid RVTR"]);
  }

  const validation = await validate({ rvtr: normalized, action });
  if (!validation.ok) {
    return blockedWorkerResult(normalized, action, validation.blockers);
  }

  try {
    const { runCollectorForSong } = await import("./run-collector");
    const resolved = await resolveCollectorInput(normalized, input.payload);
    await runCollectorForSong(resolved);
    return { rvtr: normalized, action, status: "complete", message: "Collector complete" };
  } catch (err) {
    return failedWorkerResult(normalized, action, err);
  }
}

export const collectorWorker = defineDepartmentWorker({
  id: "collector",
  department: "collector",
  capabilities: [...CAPABILITIES],
  defaultAction: DEFAULT_ACTION,
  health: async () => ({ ok: true, detail: "Collector worker ready" }),
  validate,
  status,
  run,
});
