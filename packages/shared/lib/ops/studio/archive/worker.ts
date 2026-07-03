import "server-only";

import {
  blockedWorkerResult,
  defineDepartmentWorker,
  resolveWorkerAction,
  type DepartmentWorkerRunInput,
  type DepartmentWorkerRunResult,
  type DepartmentWorkerStatusResult,
  type DepartmentWorkerValidation,
} from "@/lib/studio/worker";
import { normalizeRvtr } from "@/lib/studio/status";
import { researchDepartmentPaths } from "@/lib/studio/package";

import { artifactStatusForKinds } from "../workers/artifact-status";

const CAPABILITIES = ["verify"] as const;
const DEFAULT_ACTION = "verify";

const ARCHIVE_ARTIFACTS = [
  "collector",
  "visual-identity",
  "song-dna",
  "editor",
  "director-handoff",
  "director",
  "director-render-spec",
] as const;

async function validate(input: {
  rvtr: string;
  action?: string;
}): Promise<DepartmentWorkerValidation> {
  const normalized = normalizeRvtr(input.rvtr);
  if (!normalized) {
    return { ok: false, status: "blocked", blockers: ["Invalid RVTR"] };
  }
  return { ok: true, status: "ready", blockers: [] };
}

async function status(rvtr: string): Promise<DepartmentWorkerStatusResult> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) {
    return { status: "blocked", detail: "Invalid RVTR", artifactsPresent: {} };
  }
  const artifactsPresent = await artifactStatusForKinds(normalized, [...ARCHIVE_ARTIFACTS]);
  const presentCount = ARCHIVE_ARTIFACTS.filter((k) => artifactsPresent[k]).length;
  return {
    status: presentCount > 0 ? "ready" : "idle",
    detail: `${presentCount}/${ARCHIVE_ARTIFACTS.length} Studio Alpha artifacts present`,
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

  const paths = researchDepartmentPaths(normalized);
  const artifactsPresent = await artifactStatusForKinds(normalized, [...ARCHIVE_ARTIFACTS]);
  const missing = ARCHIVE_ARTIFACTS.filter((kind) => !artifactsPresent[kind]);

  return {
    rvtr: normalized,
    action,
    status: "complete",
    message:
      missing.length === 0
        ? `Archive verified — all artifacts present (${paths.songDir})`
        : `Archive verified — missing: ${missing.join(", ")} (${paths.songDir})`,
  };
}

export const archiveWorker = defineDepartmentWorker({
  id: "archive",
  department: "archive",
  capabilities: [...CAPABILITIES],
  defaultAction: DEFAULT_ACTION,
  health: async () => ({ ok: true, detail: "Archive worker ready" }),
  validate,
  status,
  run,
});
