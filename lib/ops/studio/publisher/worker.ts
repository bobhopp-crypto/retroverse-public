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

import { allArtifactsPresent, departmentArtifactStatus } from "../workers/artifact-status";

const CAPABILITIES = ["validate", "publish"] as const;
const DEFAULT_ACTION = "validate";

async function validate(input: {
  rvtr: string;
  action?: string;
}): Promise<DepartmentWorkerValidation> {
  const normalized = normalizeRvtr(input.rvtr);
  if (!normalized) {
    return { ok: false, status: "blocked", blockers: ["Invalid RVTR"] };
  }

  const artifacts = await departmentArtifactStatus(normalized, "publisher");
  const hasDirector = allArtifactsPresent(artifacts, ["director", "director-render-spec"]);
  const hasIntelligence = artifacts.intelligence === true;

  if (!hasDirector && !hasIntelligence) {
    return {
      ok: false,
      status: "blocked",
      blockers: ["No director package or intelligence package"],
    };
  }

  return { ok: true, status: "ready", blockers: [] };
}

async function status(rvtr: string): Promise<DepartmentWorkerStatusResult> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) {
    return { status: "blocked", detail: "Invalid RVTR", artifactsPresent: {} };
  }
  const artifactsPresent = await departmentArtifactStatus(normalized, "publisher");
  const ready =
    allArtifactsPresent(artifactsPresent, ["director", "director-render-spec"]) ||
    artifactsPresent.intelligence === true;
  return {
    status: ready ? "ready" : "blocked",
    detail: ready ? "Publish inputs available" : "Missing publish inputs",
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

  if (action === "publish") {
    return {
      rvtr: normalized,
      action,
      status: "skipped",
      message: "Publisher worker not implemented",
    };
  }

  return {
    rvtr: normalized,
    action,
    status: "complete",
    message: "Publish inputs validated",
  };
}

export const publisherWorker = defineDepartmentWorker({
  id: "publisher",
  department: "publisher",
  capabilities: [...CAPABILITIES],
  defaultAction: DEFAULT_ACTION,
  health: async () => ({ ok: true, detail: "Publisher worker stub ready" }),
  validate,
  status,
  run,
});
