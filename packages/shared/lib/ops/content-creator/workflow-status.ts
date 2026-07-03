import type { CreativeLabProjectFile } from "@/lib/ops/creative-lab/types";
import { deriveWorkstationStatus } from "@/lib/ops/creative-lab/workstation-state";

export function formatElapsed(startedAt: string | undefined, nowMs: number): string {
  if (!startedAt) return "";
  const start = Date.parse(startedAt);
  if (!Number.isFinite(start)) return "";
  const sec = Math.max(0, Math.floor((nowMs - start) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function workflowStatusMessage(args: {
  project: CreativeLabProjectFile | null;
  busy: boolean;
  backGenerating: boolean;
  nowMs: number;
}): string {
  const { project, busy, backGenerating, nowMs } = args;
  const ws = deriveWorkstationStatus(project);

  if (project?.generationProgress && busy) {
    const g = project.generationProgress;
    const elapsed = formatElapsed(g.startedAt, nowMs);
    return elapsed ? `${g.label} (${elapsed})` : g.label;
  }

  if (busy && backGenerating) {
    return "Generating Back…";
  }

  if (busy) {
    return "Working…";
  }

  if (ws.exportStatus === "Ready") {
    return "Export Ready";
  }

  const backAsset = project?.selectedBackPromptId
    ? project.assets.find(
        (a) => a.id === project.generatedPrompts.find((p) => p.id === project.selectedBackPromptId)?.assetId,
      )
    : null;
  if (backAsset?.status === "approved" || backAsset?.status === "final") {
    return "Back Approved";
  }

  if (project?.backVariationSetId) {
    return "Backs Ready";
  }

  if (project?.frontLocked) {
    return "Front Approved";
  }

  if (project?.selectedConceptPromptId) {
    return "Front Selected — approve when ready";
  }

  if (project?.generatedPrompts.some((p) => (p.passSide ?? "front") !== "back")) {
    return "Fronts Ready — select your favorite";
  }

  return "Choose era, then Generate";
}
