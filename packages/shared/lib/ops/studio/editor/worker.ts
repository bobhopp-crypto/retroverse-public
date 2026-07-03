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

import { artifactExists, departmentArtifactStatus } from "../workers/artifact-status";

const CAPABILITIES = ["draft", "save"] as const;
const DEFAULT_ACTION = "draft";

async function validate(input: {
  rvtr: string;
  action?: string;
}): Promise<DepartmentWorkerValidation> {
  const normalized = normalizeRvtr(input.rvtr);
  if (!normalized) {
    return { ok: false, status: "blocked", blockers: ["Invalid RVTR"] };
  }
  const hasCollector = await artifactExists(normalized, "collector");
  if (!hasCollector) {
    return { ok: false, status: "blocked", blockers: ["No collector package"] };
  }
  return { ok: true, status: "ready", blockers: [] };
}

async function status(rvtr: string): Promise<DepartmentWorkerStatusResult> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) {
    return { status: "blocked", detail: "Invalid RVTR", artifactsPresent: {} };
  }
  const artifactsPresent = await departmentArtifactStatus(normalized, "editor");
  const hasEditor = artifactsPresent.editor === true;
  const hasHandoff = artifactsPresent["director-handoff"] === true;
  return {
    status: hasEditor ? "complete" : hasHandoff ? "ready" : "idle",
    detail: hasEditor
      ? "Editor package on disk"
      : "Awaiting editor draft",
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
    const { loadCollectorPackage } = await import("@/lib/ops/studio/collector/store");
    const { loadOrDraftEditorStory, saveEditorStory, loadEditorStory } = await import("./store");

    const collector = await loadCollectorPackage(normalized);
    if (!collector) {
      return blockedWorkerResult(normalized, action, ["No collector package"]);
    }

    if (action === "save") {
      const story = await loadEditorStory(normalized);
      if (!story) {
        return blockedWorkerResult(normalized, action, ["No editor package to save"]);
      }
      await saveEditorStory(story);
      return { rvtr: normalized, action, status: "complete", message: "Editor package saved" };
    }

    const { story: drafted } = await loadOrDraftEditorStory(normalized, collector);
    await saveEditorStory(drafted);

    const { runEditorPassThrough } = await import("./pass-through");
    const pass = await runEditorPassThrough({ collector, story: drafted });
    await saveEditorStory(pass.story);

    const message = pass.submitted
      ? "Editor submitted — Director handoff ready"
      : "Editor draft ready — handoff exists";
    return { rvtr: normalized, action, status: "complete", message };
  } catch (err) {
    return failedWorkerResult(normalized, action, err);
  }
}

export const editorWorker = defineDepartmentWorker({
  id: "editor",
  department: "editor",
  capabilities: [...CAPABILITIES],
  defaultAction: DEFAULT_ACTION,
  health: async () => ({ ok: true, detail: "Editor worker ready" }),
  validate,
  status,
  run,
});
