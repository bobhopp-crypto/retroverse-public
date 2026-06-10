import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

/** `RETROVERSE_DATA/creative_lab` */
export function creativeLabRoot(): string {
  return join(retroverseDataRoot(), "creative_lab");
}

/** `RETROVERSE_DATA/creative_lab/styles` — weighted style presets */
export function creativeLabStylesDir(): string {
  return join(creativeLabRoot(), "styles");
}

export function creativeLabStylePresetPath(presetId: string): string {
  return join(creativeLabStylesDir(), `${presetId}.json`);
}

/** `RETROVERSE_DATA/creative_lab/projects` */
export function creativeLabProjectsDir(): string {
  return join(creativeLabRoot(), "projects");
}

/** Project root folder — `projects/{projectId}/` */
export function creativeLabProjectDir(projectId: string): string {
  return join(creativeLabProjectsDir(), projectId);
}

export function creativeLabProjectPath(projectId: string): string {
  return join(creativeLabProjectDir(projectId), "project.json");
}

export function creativeLabProjectPromptsDir(projectId: string): string {
  return join(creativeLabProjectDir(projectId), "prompts");
}

export function creativeLabProjectConceptsDir(projectId: string): string {
  return join(creativeLabProjectDir(projectId), "concepts");
}

export function creativeLabProjectGeneratedDir(projectId: string): string {
  return join(creativeLabProjectDir(projectId), "generated");
}

export function creativeLabProjectSelectedDir(projectId: string): string {
  return join(creativeLabProjectDir(projectId), "selected");
}

export function creativeLabProjectExportsDir(projectId: string): string {
  return join(creativeLabProjectDir(projectId), "exports");
}

export function creativeLabProjectNotesDir(projectId: string): string {
  return join(creativeLabProjectDir(projectId), "notes");
}

export function creativeLabProjectIndexPath(): string {
  return join(creativeLabRoot(), "index.json");
}

export const PROJECT_SUBDIRS = [
  "prompts",
  "concepts",
  "generated",
  "selected",
  "exports",
  "notes",
] as const;
