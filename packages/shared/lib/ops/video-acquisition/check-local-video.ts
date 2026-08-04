import "server-only";

import { access, readdir, stat, unlink } from "fs/promises";
import { join } from "path";

import { findVdjEntryByRvtr } from "@/lib/ops/intelligence/experience-inspector/vdj-rvtr-entries";
import { normVdjPath, scanVdjDatabase } from "@/lib/ops/intelligence/vdj-database";
import { loadMediaLinksForRvtr } from "@/lib/ops/intelligence/experience-inspector/load-media-links";
import { isOpsPlayableVideoPath } from "@/lib/ops/ops-video-media";

import { loadAcquisitionManifest } from "./manifest-store";
import { normArtistTitleKey } from "./filenames";
import { probeVideoFile } from "./probe-video";
import type { LocalOwnershipMatchMethod, LocalOwnershipResult } from "./types";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function buildOwnedResult(
  filepath: string,
  matchMethod: LocalOwnershipMatchMethod,
  vdjFilePath: string | null,
): Promise<LocalOwnershipResult> {
  const probe = await probeVideoFile(filepath);
  let fileSizeBytes = probe.fileSizeBytes;
  if (!probe.valid) {
    try {
      fileSizeBytes = (await stat(filepath)).size;
    } catch {
      fileSizeBytes = 0;
    }
  }
  return {
    owned: true,
    filepath,
    matchMethod,
    fileSizeBytes,
    durationSeconds: probe.durationSeconds,
    videoCodec: probe.videoCodec,
    audioCodec: probe.audioCodec,
    width: probe.width,
    height: probe.height,
    vdjFilePath,
  };
}

export async function checkLocalVideoOwnership(input: {
  rvtr: string;
  artist: string;
  title: string;
  vdjFilePath?: string | null;
}): Promise<LocalOwnershipResult> {
  const empty: LocalOwnershipResult = {
    owned: false,
    filepath: null,
    matchMethod: null,
    fileSizeBytes: null,
    durationSeconds: null,
    videoCodec: null,
    audioCodec: null,
    width: null,
    height: null,
    vdjFilePath: input.vdjFilePath?.trim() || null,
  };

  const rvtr = input.rvtr.trim().toUpperCase();

  const vdjByRvtr = await findVdjEntryByRvtr(rvtr);
  if (vdjByRvtr?.isVideo && isOpsPlayableVideoPath(vdjByRvtr.filePath) && (await fileExists(vdjByRvtr.filePath))) {
    return buildOwnedResult(vdjByRvtr.filePath, "rvtr_vdj_label", vdjByRvtr.filePath);
  }

  const explicitPath = input.vdjFilePath?.trim();
  if (explicitPath && isOpsPlayableVideoPath(explicitPath) && (await fileExists(explicitPath))) {
    return buildOwnedResult(explicitPath, "vdj_filepath", explicitPath);
  }

  try {
    const mediaLinks = await loadMediaLinksForRvtr(rvtr);
    for (const row of mediaLinks) {
      const path = row.sourcePath?.trim();
      if (!path || !isOpsPlayableVideoPath(path) || !(await fileExists(path))) continue;
      return buildOwnedResult(path, "media_link", explicitPath ?? vdjByRvtr?.filePath ?? null);
    }
  } catch {
    // Postgres optional offline — continue with VDJ-only checks.
  }

  const manifest = await loadAcquisitionManifest(rvtr);
  if (manifest?.finalPath && isOpsPlayableVideoPath(manifest.finalPath) && (await fileExists(manifest.finalPath))) {
    return buildOwnedResult(
      manifest.finalPath,
      "sidecar_manifest",
      explicitPath ?? vdjByRvtr?.filePath ?? null,
    );
  }

  const targetKey = normArtistTitleKey(input.artist, input.title);
  if (targetKey !== "|") {
    const scan = await scanVdjDatabase();
    for (const entry of scan.entries) {
      if (!entry.isVideo || !isOpsPlayableVideoPath(entry.filePath)) continue;
      const entryKey = normArtistTitleKey(entry.artist, entry.title);
      if (entryKey !== targetKey) continue;
      if (!(await fileExists(entry.filePath))) continue;
      return buildOwnedResult(
        entry.filePath,
        "artist_title_vdj",
        explicitPath ?? entry.filePath,
      );
    }
  }

  return empty;
}

export async function findVdjPathForRvtr(rvtr: string): Promise<string | null> {
  const entry = await findVdjEntryByRvtr(rvtr);
  return entry?.filePath ?? null;
}

export async function isSongBlockInVdjDatabase(filePath: string): Promise<boolean> {
  const target = normVdjPath(filePath);
  const scan = await scanVdjDatabase();
  return scan.entries.some((entry) => entry.filePathNorm === target);
}

export async function listStagingPartialFiles(rvtr: string, stagingDir: string): Promise<string[]> {
  let files: string[] = [];
  try {
    files = await readdir(stagingDir);
  } catch {
    return [];
  }
  return files.filter((name) => name.endsWith(".part")).map((name) => join(stagingDir, name));
}

export async function removePartialDownloads(stagingDir: string): Promise<void> {
  const partials = await listStagingPartialFiles("", stagingDir);
  for (const file of partials) {
    await unlink(file).catch(() => undefined);
  }
}
