import "server-only";

import { access } from "fs/promises";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { buildDirectorHandoffFromEditor } from "@/lib/ops/studio/editor/director-package";
import { runEditorPassThrough } from "@/lib/ops/studio/editor/pass-through";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";
import type { EditorStoryPackage } from "@/lib/ops/studio/editor/types";
import { directorHandoffPath } from "@/lib/ops/studio/director/paths";
import { loadDirectorHandoff, saveDirectorHandoff } from "@/lib/ops/studio/director/store";

async function handoffFileExists(rvtr: string): Promise<boolean> {
  try {
    await access(directorHandoffPath(rvtr));
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarantee Editor → Director handoff file exists.
 * Auto-submits Editor when structurally ready (no manual review gate).
 */
export async function ensureDirectorHandoff(input: {
  rvtr: string;
  collector?: CollectorPackage | null;
  story?: EditorStoryPackage | null;
}): Promise<{ story: EditorStoryPackage; warnings: string[]; createdHandoff: boolean }> {
  const rvtr = input.rvtr.trim().toUpperCase();
  const collector = input.collector ?? (await loadCollectorPackage(rvtr));
  if (!collector) throw new Error("missing_collector");

  let story = input.story ?? (await loadEditorStory(rvtr));
  if (!story) throw new Error("missing_editor");

  const warnings: string[] = [];
  let createdHandoff = false;

  if (story.meta.editorialStatus !== "submitted") {
    const pass = await runEditorPassThrough({ collector, story });
    story = pass.story;
    warnings.push(...pass.warnings);
    createdHandoff = pass.submitted;
  } else if (!(await handoffFileExists(rvtr))) {
    const handoff = buildDirectorHandoffFromEditor(story);
    await saveDirectorHandoff(handoff);
    createdHandoff = true;
  }

  const loaded = await loadDirectorHandoff(rvtr);
  if (!loaded) {
    throw new Error("director_handoff_missing");
  }

  return { story, warnings, createdHandoff };
}
