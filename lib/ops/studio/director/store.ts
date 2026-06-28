import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { directorHandoffPath, directorOutputPath, directorRenderSpecPath } from "./paths";
import {
  archiveDirectorPlanSnapshot,
  buildCoachingRuleHints,
  listAllCoachingRecords,
} from "./coaching";
import {
  mergeCriticIntoCoachingHints,
  mergeGoldenCriticIntoCoachingHints,
} from "@/lib/ops/studio/publisher/experience/critic/coaching-bridge";
import { assertNotGoldenForDirectorRun } from "@/lib/ops/studio/publisher/experience/golden";
import { getPublisherRecord } from "@/lib/ops/studio/publisher/store";
import type { CoachingRuleHints } from "./coaching/types";
import { runExperienceDriftCheck } from "@/lib/ops/studio/publisher/experience/drift";
import { runDirectorOnHandoff } from "./run-director";
import type { DirectorPackage } from "./types";

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Coaching from operator records, Experience Critic, and golden exemplars. */
export async function buildDirectorCoachingHints(rvtr: string): Promise<CoachingRuleHints> {
  const [records, publisherRecord] = await Promise.all([
    listAllCoachingRecords(),
    getPublisherRecord(rvtr),
  ]);

  let hints = buildCoachingRuleHints(records);
  hints = mergeCriticIntoCoachingHints(
    hints,
    publisherRecord?.evaluation?.experienceCritic ?? null,
  );
  hints = await mergeGoldenCriticIntoCoachingHints(hints);
  return hints;
}

export async function loadDirectorHandoff(
  rvtr: string,
): Promise<DirectorEditorialPackage | null> {
  try {
    const raw = await readFile(directorHandoffPath(rvtr), "utf8");
    return JSON.parse(raw) as DirectorEditorialPackage;
  } catch {
    return null;
  }
}

export async function saveDirectorHandoff(
  handoff: DirectorEditorialPackage,
): Promise<void> {
  await writeJson(directorHandoffPath(handoff.rvtr), handoff);
}

export async function loadDirectorPackage(rvtr: string): Promise<DirectorPackage | null> {
  try {
    const raw = await readFile(directorOutputPath(rvtr), "utf8");
    return JSON.parse(raw) as DirectorPackage;
  } catch {
    return null;
  }
}

export async function saveDirectorPackage(pkg: DirectorPackage): Promise<void> {
  await writeJson(directorOutputPath(pkg.rvtr), pkg);
}

/** Load handoff → build plan + render spec → write director.json + director-render-spec.json */
export async function runAndSaveDirector(rvtr: string): Promise<DirectorPackage | null> {
  await assertNotGoldenForDirectorRun(rvtr);

  const handoff = await loadDirectorHandoff(rvtr);
  if (!handoff) return null;

  const existing = await loadDirectorPackage(rvtr);
  if (existing) {
    await archiveDirectorPlanSnapshot({
      rvtr,
      generatedAt: existing.generatedAt,
      sceneCount: existing.experiencePlan.scenes.length,
      experiencePlan: existing.experiencePlan,
    });
  }

  const coachingHints = await buildDirectorCoachingHints(rvtr);
  const { loadRetrograph } = await import("@/lib/ops/studio/retrograph/store");
  const { loadSongDnaPackage } = await import("@/lib/ops/studio/collector/song-dna-store");
  const [retrograph, songDna] = await Promise.all([
    loadRetrograph(rvtr),
    loadSongDnaPackage(rvtr),
  ]);
  const pkg = runDirectorOnHandoff(handoff, coachingHints, retrograph, {
    hasSongDna: Boolean(songDna),
  });
  await saveDirectorPackage(pkg);
  if (pkg.renderSpec) {
    await writeJson(directorRenderSpecPath(pkg.rvtr), pkg.renderSpec);
  }

  void runExperienceDriftCheck(rvtr).catch(() => undefined);

  return pkg;
}
