import type { CreativeLabAsset, CreativeLabProjectFile, GeneratedPrompt } from "./types";

export type FrontStatusLabel = "None" | "Draft" | "Approved";
export type BackStatusLabel = "None" | "Draft" | "Approved";
export type ExportStatusLabel = "Not Ready" | "Ready";

export type WorkstationStatus = {
  projectName: string;
  frontStatus: FrontStatusLabel;
  backStatus: BackStatusLabel;
  exportStatus: ExportStatusLabel;
  selectedFrontKey: string | null;
  approvedFrontKey: string | null;
  selectedBackKey: string | null;
};

export function assetUrl(project: Pick<CreativeLabProjectFile, "id" | "folderSlug">, assetId: string): string {
  const slug = project.folderSlug || project.id;
  return `/api/ops/creative-lab/projects/${encodeURIComponent(slug)}/assets/${encodeURIComponent(assetId)}`;
}

export function assetForPrompt(
  project: CreativeLabProjectFile,
  prompt: GeneratedPrompt,
): CreativeLabAsset | undefined {
  if (prompt.assetId) {
    const linked = project.assets.find((a) => a.id === prompt.assetId);
    if (linked?.filePath?.endsWith(".png")) return linked;
  }
  return project.assets.find((a) => a.promptId === prompt.id && a.filePath?.endsWith(".png"));
}

export function frontPrompts(project: CreativeLabProjectFile): GeneratedPrompt[] {
  const setId =
    project.frontVariationSetId ??
    project.generatedPrompts.find((p) => (p.passSide ?? "front") !== "back")?.variationSetId;
  if (!setId) {
    return project.generatedPrompts.filter((p) => (p.passSide ?? "front") !== "back").slice(0, 4);
  }
  return project.generatedPrompts.filter(
    (p) => (p.passSide ?? "front") !== "back" && p.variationSetId === setId,
  );
}

export function backPrompts(project: CreativeLabProjectFile): GeneratedPrompt[] {
  if (!project.backVariationSetId) return [];
  return project.generatedPrompts.filter(
    (p) => p.passSide === "back" && p.variationSetId === project.backVariationSetId,
  );
}

export function deriveWorkstationStatus(project: CreativeLabProjectFile | null): WorkstationStatus {
  if (!project) {
    return {
      projectName: "No project",
      frontStatus: "None",
      backStatus: "None",
      exportStatus: "Not Ready",
      selectedFrontKey: null,
      approvedFrontKey: null,
      selectedBackKey: null,
    };
  }

  const frontStatus: FrontStatusLabel = project.frontLocked
    ? "Approved"
    : project.selectedConceptPromptId
      ? "Draft"
      : "None";

  let backStatus: BackStatusLabel = "None";
  if (project.selectedBackPromptId) {
    const backPrompt = project.generatedPrompts.find((p) => p.id === project.selectedBackPromptId);
    const backAsset = backPrompt?.assetId
      ? project.assets.find((a) => a.id === backPrompt.assetId)
      : undefined;
    backStatus =
      backAsset?.status === "approved" || backAsset?.status === "final" ? "Approved" : "Draft";
  }

  const exportStatus: ExportStatusLabel =
    project.frontLocked && project.selectedBackPromptId ? "Ready" : "Not Ready";

  return {
    projectName: project.name,
    frontStatus,
    backStatus,
    exportStatus,
    selectedFrontKey: project.selectedConceptKey ?? null,
    approvedFrontKey: project.frontLocked ? (project.selectedConceptKey ?? null) : null,
    selectedBackKey: project.selectedBackKey ?? null,
  };
}
