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

export function creativeLabProjectPath(projectId: string): string {
  return join(creativeLabProjectsDir(), projectId, "project.json");
}

export function creativeLabProjectIndexPath(): string {
  return join(creativeLabRoot(), "index.json");
}
