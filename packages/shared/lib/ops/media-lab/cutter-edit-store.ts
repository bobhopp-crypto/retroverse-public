import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { writeJsonAtomic } from "@/lib/ops/virtualdj-media-coverage/atomic-json";

import {
  createEmptyCutterManifest,
  migrateLegacyManualSegments,
  type CutterManifest,
  type LegacyManualSegment,
} from "./cutter-edit-model";

export const CUTTER_MANIFEST_FILENAME = "clip-extractions.json";

export function cutterManifestPath(jobDirectory: string): string {
  return join(jobDirectory, CUTTER_MANIFEST_FILENAME);
}

export async function readCutterManifest(
  jobDirectory: string,
): Promise<CutterManifest | null> {
  try {
    const parsed = JSON.parse(
      await readFile(cutterManifestPath(jobDirectory), "utf8"),
    ) as CutterManifest;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.extractedClips) ||
      !Array.isArray(parsed.editHistory)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCutterManifestAtomic(
  jobDirectory: string,
  manifest: CutterManifest,
): Promise<void> {
  await writeJsonAtomic(cutterManifestPath(jobDirectory), manifest);
}

async function readLegacySegments(jobDirectory: string): Promise<LegacyManualSegment[]> {
  try {
    const parsed = JSON.parse(
      await readFile(join(jobDirectory, "editorial-segments.json"), "utf8"),
    ) as { segments?: LegacyManualSegment[] };
    return Array.isArray(parsed.segments) ? parsed.segments : [];
  } catch {
    return [];
  }
}

export async function loadOrMigrateCutterManifest(options: {
  jobDirectory: string;
  sourceFilename: string;
  sourceFingerprint: string;
  sourceDurationSec: number;
  now: string;
}): Promise<{
  manifest: CutterManifest;
  migratedCount: number;
  skippedLegacyCount: number;
}> {
  const existing = await readCutterManifest(options.jobDirectory);
  if (existing) {
    return { manifest: existing, migratedCount: 0, skippedLegacyCount: 0 };
  }

  const legacySegments = await readLegacySegments(options.jobDirectory);
  if (legacySegments.length === 0) {
    return {
      manifest: createEmptyCutterManifest({
        sourceFilename: options.sourceFilename,
        sourceFingerprint: options.sourceFingerprint,
        sourceDurationSec: options.sourceDurationSec,
        now: options.now,
      }),
      migratedCount: 0,
      skippedLegacyCount: 0,
    };
  }

  const migrated = migrateLegacyManualSegments(legacySegments, {
    sourceFilename: options.sourceFilename,
    sourceFingerprint: options.sourceFingerprint,
    sourceDurationSec: options.sourceDurationSec,
    now: options.now,
  });
  if (migrated.migratedCount > 0) {
    await writeCutterManifestAtomic(options.jobDirectory, migrated.manifest);
  }
  return {
    manifest: migrated.manifest,
    migratedCount: migrated.migratedCount,
    skippedLegacyCount: migrated.skippedCount,
  };
}
