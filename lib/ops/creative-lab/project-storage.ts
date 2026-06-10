import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  PROJECT_SUBDIRS,
  creativeLabProjectConceptsDir,
  creativeLabProjectDir,
  creativeLabProjectGeneratedDir,
  creativeLabProjectNotesDir,
  creativeLabProjectPath,
  creativeLabProjectPromptsDir,
  creativeLabProjectSelectedDir,
  creativeLabProjectExportsDir,
} from "./paths";
import type { CreativeLabProjectFile, GeneratedPrompt } from "./types";

export async function ensureProjectLayout(projectId: string): Promise<string> {
  const dir = creativeLabProjectDir(projectId);
  await mkdir(dir, { recursive: true });
  for (const sub of PROJECT_SUBDIRS) {
    await mkdir(join(dir, sub), { recursive: true });
  }
  const readme = join(creativeLabProjectNotesDir(projectId), "README.txt");
  try {
    await writeFile(
      readme,
      "Creative Lab project notes — add production notes, art direction, or approval comments here.\n",
      { flag: "wx" },
    );
  } catch {
    // exists
  }
  return dir;
}

export async function persistProjectBundle(project: CreativeLabProjectFile): Promise<void> {
  const projectId = project.folderSlug || project.id;
  await ensureProjectLayout(projectId);
  await writeFile(creativeLabProjectPath(projectId), `${JSON.stringify(project, null, 2)}\n`, "utf8");
  await persistPrompts(projectId, project.generatedPrompts);
  await persistConceptSets(projectId, project.generatedPrompts);
}

async function persistPrompts(projectId: string, prompts: GeneratedPrompt[]): Promise<void> {
  const dir = creativeLabProjectPromptsDir(projectId);
  await mkdir(dir, { recursive: true });
  for (const prompt of prompts) {
    await writeFile(join(dir, `${prompt.id}.json`), `${JSON.stringify(prompt, null, 2)}\n`, "utf8");
    await writeFile(join(dir, `${prompt.id}.txt`), `${prompt.renderedPrompt}\n`, "utf8");
  }
}

async function persistConceptSets(projectId: string, prompts: GeneratedPrompt[]): Promise<void> {
  const dir = creativeLabProjectConceptsDir(projectId);
  await mkdir(dir, { recursive: true });
  const sets = new Map<string, GeneratedPrompt[]>();
  for (const p of prompts) {
    if (!p.variationSetId) continue;
    const list = sets.get(p.variationSetId) ?? [];
    list.push(p);
    sets.set(p.variationSetId, list);
  }
  for (const [setId, rows] of sets) {
    await writeFile(
      join(dir, `${setId}.json`),
      `${JSON.stringify({ variationSetId: setId, concepts: rows }, null, 2)}\n`,
      "utf8",
    );
  }
}

export function projectStorageSummary(projectId: string): Record<string, string> {
  const base = creativeLabProjectDir(projectId);
  return {
    root: base,
    projectJson: creativeLabProjectPath(projectId),
    prompts: creativeLabProjectPromptsDir(projectId),
    concepts: creativeLabProjectConceptsDir(projectId),
    generated: creativeLabProjectGeneratedDir(projectId),
    selected: creativeLabProjectSelectedDir(projectId),
    exports: creativeLabProjectExportsDir(projectId),
    notes: creativeLabProjectNotesDir(projectId),
  };
}
