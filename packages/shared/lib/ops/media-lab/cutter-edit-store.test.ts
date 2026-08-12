import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { createEmptyCutterManifest } from "./cutter-edit-model";
import {
  CUTTER_MANIFEST_FILENAME,
  loadOrMigrateCutterManifest,
  readCutterManifest,
  writeCutterManifestAtomic,
} from "./cutter-edit-store";
import {
  emptyCutterWorkspacePreference,
  normalizeCutterWorkspacePreference,
  readCutterWorkspacePreference,
  writeCutterWorkspacePreference,
} from "./cutter-workspace-store";

test("atomic manifest write and reload reconstruct identical extraction state", async () => {
  const directory = await mkdtemp(join(tmpdir(), "media-lab-cutter-"));
  try {
    const manifest = createEmptyCutterManifest({
      sourceFilename: "source.mp4",
      sourceFingerprint: "fp",
      sourceDurationSec: 100,
      now: "2026-07-30T12:00:00.000Z",
    });
    await writeCutterManifestAtomic(directory, manifest);
    assert.deepEqual(await readCutterManifest(directory), manifest);
    assert.doesNotMatch(
      await readFile(join(directory, CUTTER_MANIFEST_FILENAME), "utf8"),
      /\.tmp/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("valid existing manual clips migrate once into the versioned cutter artifact", async () => {
  const directory = await mkdtemp(join(tmpdir(), "media-lab-migrate-"));
  try {
    await writeFile(
      join(directory, "editorial-segments.json"),
      JSON.stringify({
        segments: [
          {
            id: "manual-one",
            sourceFilename: "source.mp4",
            sourceFingerprint: "fp",
            startSeconds: 1,
            endSeconds: 2,
            title: "Saved title",
            createdAt: "2026-07-30T12:00:00.000Z",
          },
          {
            id: "generated-one",
            sourceFilename: "source.mp4",
            sourceFingerprint: "fp",
            startSeconds: 2,
            endSeconds: 3,
            title: "Generated",
          },
        ],
      }),
      "utf8",
    );
    const migrated = await loadOrMigrateCutterManifest({
      jobDirectory: directory,
      sourceFilename: "source.mp4",
      sourceFingerprint: "fp",
      sourceDurationSec: 10,
      now: "2026-07-30T12:01:00.000Z",
    });
    assert.equal(migrated.migratedCount, 1);
    assert.equal(migrated.skippedLegacyCount, 1);
    assert.equal(migrated.manifest.extractedClips[0].id, "manual-one");
    const reloaded = await loadOrMigrateCutterManifest({
      jobDirectory: directory,
      sourceFilename: "source.mp4",
      sourceFingerprint: "fp",
      sourceDurationSec: 10,
      now: "2026-07-30T12:02:00.000Z",
    });
    assert.equal(reloaded.migratedCount, 0);
    assert.deepEqual(reloaded.manifest, migrated.manifest);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("active job preference is server-persisted and normalized safely", async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), "media-lab-preference-"));
  try {
    const preference = {
      ...emptyCutterWorkspacePreference("2026-07-30T12:00:00.000Z"),
      activeJob: { year: 1969, jobSlug: "woodstock" },
      detailWindowDurationSec: 300 as const,
      selectedClipId: "CLIP-1",
      sourcePlayheadSec: 10.5,
    };
    await writeCutterWorkspacePreference(preference, stateRoot);
    assert.deepEqual(await readCutterWorkspacePreference(stateRoot), preference);
    assert.equal(
      normalizeCutterWorkspacePreference({ detailWindowDurationSec: 999 })
        .detailWindowDurationSec,
      60,
    );
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
  }
});
