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

import { departmentArtifactStatus } from "@/lib/ops/studio/workers/artifact-status";

const CAPABILITIES = ["process", "refresh"] as const;
const DEFAULT_ACTION = "process";

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
  const artifactsPresent = await departmentArtifactStatus(normalized, "research");
  const hasPackage = artifactsPresent.intelligence === true;
  return {
    status: hasPackage ? "complete" : "idle",
    detail: hasPackage ? "Intelligence package on disk" : "No intelligence package",
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
    const { processSong } = await import("./process-song");
    await processSong(normalized);
    return {
      rvtr: normalized,
      action,
      status: "complete",
      message: action === "refresh" ? "Research refreshed" : "Research processed",
    };
  } catch (err) {
    return failedWorkerResult(normalized, action, err);
  }
}

export const researchWorker = defineDepartmentWorker({
  id: "research",
  department: "research",
  capabilities: [...CAPABILITIES],
  defaultAction: DEFAULT_ACTION,
  health: async () => ({ ok: true, detail: "Research worker ready" }),
  validate,
  status,
  run,
});
