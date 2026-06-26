import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";
import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";

import { buildDirectorEditorialPackage, updateHandoffChecklist } from "./director-package";
import { distillCollectorPackage } from "./distill";
import { ensureEditor21Fields, syncApprovedFromWorkspace } from "./normalize";
import { migrateV1ToV2 } from "./migration";
import {
  directorHandoffPath,
  editorOutputPath,
  editorV1BackupPath,
} from "./paths";
import {
  isEditorPackageV1,
  isEditorPackageV2,
  type EditorStoryPackage,
  type EditorStoryPackageV1,
} from "./types";

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readRawEditorJson(rvtr: string): Promise<unknown | null> {
  try {
    const raw = await readFile(editorOutputPath(rvtr), "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Normalize on-disk package: migrate v1 → v2 with backup when needed. */
export async function normalizeEditorPackage(rvtr: string, raw: unknown): Promise<EditorStoryPackage | null> {
  if (isEditorPackageV2(raw)) {
    return syncApprovedFromWorkspace(ensureEditor21Fields(raw));
  }

  if (isEditorPackageV1(raw)) {
    const backupPath = editorV1BackupPath(rvtr);
    try {
      await readFile(backupPath, "utf8");
    } catch {
      await writeJson(backupPath, raw);
    }
    const migrated = migrateV1ToV2(raw as EditorStoryPackageV1);
    const normalized = syncApprovedFromWorkspace(ensureEditor21Fields(migrated));
    await writeJson(editorOutputPath(rvtr), normalized);
    return normalized;
  }

  return null;
}

export async function loadEditorStory(rvtr: string): Promise<EditorStoryPackage | null> {
  const normalized = rvtr.trim().toUpperCase();
  const raw = await readRawEditorJson(normalized);
  if (!raw) return null;
  return normalizeEditorPackage(normalized, raw);
}

export async function saveEditorStory(story: EditorStoryPackage): Promise<void> {
  const withChecklist = updateHandoffChecklist(story);
  const payload: EditorStoryPackage = {
    ...withChecklist,
    meta: {
      ...withChecklist.meta,
      rvtr: withChecklist.meta.rvtr.trim().toUpperCase(),
      updatedAt: new Date().toISOString(),
    },
  };
  await writeJson(editorOutputPath(payload.meta.rvtr), payload);
}

export async function saveDirectorHandoff(
  editor: EditorStoryPackage,
  collector: CollectorPackage,
): Promise<void> {
  const pkg = buildDirectorEditorialPackage(editor, collector);
  await writeJson(directorHandoffPath(editor.meta.rvtr), pkg);
}

/** Load existing draft or distill from Collector research. */
export async function loadOrDraftEditorStory(
  rvtr: string,
  collector?: CollectorPackage | null,
): Promise<{ story: EditorStoryPackage; seeded: boolean; collector: CollectorPackage | null }> {
  const normalized = rvtr.trim().toUpperCase();
  const pkg = collector ?? (await loadCollectorPackage(normalized));
  const existing = await loadEditorStory(normalized);

  if (existing) {
    return { story: existing, seeded: false, collector: pkg };
  }

  if (!pkg) {
    throw new Error(`No collector package for ${normalized}`);
  }

  const story = distillCollectorPackage(pkg);
  await saveEditorStory(story);
  return { story, seeded: true, collector: pkg };
}
