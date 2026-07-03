import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { msExportManifestPath } from "./paths";

export type ExportManifestStatus = "completed" | "failed" | "skipped";

export type ExportManifestEntry = {
  performance_id: string;
  episode_id: string;
  artist: string;
  song: string;
  year: string;
  grouping: string;
  output_path: string;
  export_status: ExportManifestStatus;
  error?: string;
  exported_at?: string;
  bytes?: number;
};

export type ExportManifest = {
  version: 1;
  collection_id: string;
  updated_at: string;
  destination_dir: string;
  entries: ExportManifestEntry[];
};

function emptyManifest(destinationDir: string): ExportManifest {
  return {
    version: 1,
    collection_id: "midnight_special",
    updated_at: new Date().toISOString(),
    destination_dir: destinationDir,
    entries: [],
  };
}

export async function loadExportManifest(): Promise<ExportManifest | null> {
  try {
    const raw = await readFile(msExportManifestPath(), "utf8");
    return JSON.parse(raw) as ExportManifest;
  } catch {
    return null;
  }
}

export async function saveExportManifest(manifest: ExportManifest): Promise<void> {
  await mkdir(dirname(msExportManifestPath()), { recursive: true });
  manifest.updated_at = new Date().toISOString();
  await writeFile(msExportManifestPath(), JSON.stringify(manifest, null, 2), "utf8");
}

export async function ensureExportManifest(destinationDir: string): Promise<ExportManifest> {
  const existing = await loadExportManifest();
  if (existing) return existing;
  const manifest = emptyManifest(destinationDir);
  await saveExportManifest(manifest);
  return manifest;
}

export function manifestEntryMap(
  manifest: ExportManifest,
): Map<string, ExportManifestEntry> {
  return new Map(manifest.entries.map((e) => [e.performance_id, e]));
}

export function upsertManifestEntry(
  manifest: ExportManifest,
  entry: ExportManifestEntry,
): void {
  const idx = manifest.entries.findIndex((e) => e.performance_id === entry.performance_id);
  if (idx >= 0) manifest.entries[idx] = entry;
  else manifest.entries.push(entry);
}

export function manifestStats(manifest: ExportManifest): {
  completed: number;
  failed: number;
  skipped: number;
  total_bytes: number;
} {
  let completed = 0;
  let failed = 0;
  let skipped = 0;
  let total_bytes = 0;
  for (const e of manifest.entries) {
    if (e.export_status === "completed") {
      completed += 1;
      total_bytes += e.bytes ?? 0;
    } else if (e.export_status === "failed") failed += 1;
    else if (e.export_status === "skipped") skipped += 1;
  }
  return { completed, failed, skipped, total_bytes };
}
