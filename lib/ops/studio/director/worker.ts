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
import { normalizeRvtr } from "@/lib/studio/status";

import { artifactExists, departmentArtifactStatus } from "../workers/artifact-status";

const CAPABILITIES = ["run", "rebuild"] as const;
const DEFAULT_ACTION = "run";

async function validate(input: {
  rvtr: string;
  action?: string;
}): Promise<DepartmentWorkerValidation> {
  const normalized = normalizeRvtr(input.rvtr);
  if (!normalized) {
    return { ok: false, status: "blocked", blockers: ["Invalid RVTR"] };
  }

  const hasHandoff = await artifactExists(normalized, "director-handoff");
  if (hasHandoff) {
    return { ok: true, status: "ready", blockers: [] };
  }

  const hasEditor = await artifactExists(normalized, "editor");
  if (!hasEditor) {
    return { ok: false, status: "blocked", blockers: ["No editor handoff"] };
  }

  return { ok: true, status: "ready", blockers: [] };
}

async function status(rvtr: string): Promise<DepartmentWorkerStatusResult> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) {
    return { status: "blocked", detail: "Invalid RVTR", artifactsPresent: {} };
  }
  const artifactsPresent = await departmentArtifactStatus(normalized, "director");
  const hasDirector = artifactsPresent.director === true;
  const hasRenderSpec = artifactsPresent["director-render-spec"] === true;
  return {
    status: hasDirector && hasRenderSpec ? "complete" : hasDirector ? "ready" : "idle",
    detail: hasDirector
      ? "Director package on disk"
      : "Awaiting director run",
    artifactsPresent,
  };
}

async function runDirectorPipeline(rvtr: string): Promise<DepartmentWorkerRunResult["status"]> {
  const {
    loadDirectorHandoff,
    runAndSaveDirector,
    saveDirectorHandoff,
  } = await import("./store");
  const { buildDirectorHandoffFromEditor } = await import(
    "@/lib/ops/studio/editor/director-package"
  );
  const { loadEditorStory } = await import("@/lib/ops/studio/editor/store");

  let handoff = await loadDirectorHandoff(rvtr);
  if (!handoff) {
    const editor = await loadEditorStory(rvtr);
    if (!editor) return "skipped";
    handoff = buildDirectorHandoffFromEditor(editor);
    await saveDirectorHandoff(handoff);
  }

  const pkg = await runAndSaveDirector(rvtr);
  return pkg ? "complete" : "failed";
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
    const outcome = await runDirectorPipeline(normalized);
    if (outcome === "skipped") {
      return blockedWorkerResult(normalized, action, ["No editor handoff"]);
    }
    if (outcome === "failed") {
      return {
        rvtr: normalized,
        action,
        status: "failed",
        message: "Director failed",
      };
    }
    const message =
      action === "rebuild"
        ? "Director render spec rebuilt"
        : "Director render spec saved";
    return { rvtr: normalized, action, status: "complete", message };
  } catch (err) {
    return failedWorkerResult(normalized, action, err);
  }
}

export const directorWorker = defineDepartmentWorker({
  id: "director",
  department: "director",
  capabilities: [...CAPABILITIES],
  defaultAction: DEFAULT_ACTION,
  health: async () => ({ ok: true, detail: "Director worker ready" }),
  validate,
  status,
  run,
});
