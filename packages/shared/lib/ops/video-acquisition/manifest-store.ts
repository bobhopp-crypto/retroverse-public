import { access, mkdir, readFile, readdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  acquisitionManifestsDir,
  manifestPathForRvtr,
  stagingDirForRvtr,
} from "./paths";
import type { AcquisitionManifest, AcquisitionState } from "./types";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function createEmptyManifest(input: {
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  vdjFilePath?: string | null;
}): AcquisitionManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    rvtr: input.rvtr.trim().toUpperCase(),
    state: "idle",
    artist: input.artist.trim(),
    title: input.title.trim(),
    year: input.year,
    genre: null,
    genreSource: "none",
    searchQuery: null,
    vdjFilePath: input.vdjFilePath?.trim() || null,
    selectedCandidate: null,
    approvedCandidate: null,
    candidates: [],
    stagingDir: stagingDirForRvtr(input.rvtr),
    destinationPath: null,
    finalPath: null,
    sourceUrl: null,
    youtubeId: null,
    downloadedFormat: null,
    validation: null,
    vdjLabelStatus: null,
    vdjLabelMessage: null,
    vdjBackupPath: null,
    failureStage: null,
    failureMessage: null,
    updatedAt: now,
  };
}

export async function loadAcquisitionManifest(rvtr: string): Promise<AcquisitionManifest | null> {
  const path = manifestPathForRvtr(rvtr);
  if (!(await fileExists(path))) return null;
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as AcquisitionManifest;
}

export async function saveAcquisitionManifest(manifest: AcquisitionManifest): Promise<string> {
  await mkdir(acquisitionManifestsDir(), { recursive: true });
  const path = manifestPathForRvtr(manifest.rvtr);
  const next = { ...manifest, updatedAt: new Date().toISOString() };
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return path;
}

export async function updateManifestState(
  rvtr: string,
  patch: Partial<AcquisitionManifest> & { state: AcquisitionState },
): Promise<AcquisitionManifest> {
  const existing = (await loadAcquisitionManifest(rvtr)) ?? createEmptyManifest({
    rvtr,
    artist: patch.artist ?? "",
    title: patch.title ?? "",
    year: patch.year ?? null,
    vdjFilePath: patch.vdjFilePath,
  });
  const merged: AcquisitionManifest = {
    ...existing,
    ...patch,
    rvtr: rvtr.trim().toUpperCase(),
    genre: patch.genre ?? existing.genre ?? null,
    genreSource: patch.genreSource ?? existing.genreSource ?? "none",
    updatedAt: new Date().toISOString(),
  };
  await saveAcquisitionManifest(merged);
  return merged;
}

export async function listRecordedYoutubeIds(excludeRvtr?: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await mkdir(acquisitionManifestsDir(), { recursive: true });
  let files: string[] = [];
  try {
    files = await readdir(acquisitionManifestsDir());
  } catch {
    return out;
  }
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await readFile(join(acquisitionManifestsDir(), file), "utf8");
    const manifest = JSON.parse(raw) as AcquisitionManifest;
    const rvtr = manifest.rvtr?.trim().toUpperCase();
    if (!rvtr || (excludeRvtr && rvtr === excludeRvtr.trim().toUpperCase())) continue;
    const id = manifest.youtubeId ?? manifest.approvedCandidate?.videoId ?? null;
    if (id) out.set(id, rvtr);
  }
  return out;
}

export async function writeFailureLog(rvtr: string, stage: string, message: string): Promise<void> {
  const dir = stagingDirForRvtr(rvtr);
  await mkdir(dir, { recursive: true });
  const line = `[${new Date().toISOString()}] ${stage}: ${message}\n`;
  await writeFile(join(dir, "failure.log"), line, { flag: "a" });
}

export async function cleanupPartialDownloads(stagingDir: string): Promise<void> {
  let files: string[] = [];
  try {
    files = await readdir(stagingDir);
  } catch {
    return;
  }
  for (const name of files) {
    if (name.endsWith(".part")) {
      await writeFile(join(stagingDir, name), "", { flag: "w" }).catch(() => undefined);
      try {
        const { unlink } = await import("fs/promises");
        await unlink(join(stagingDir, name));
      } catch {
        // ignore
      }
    }
  }
}
