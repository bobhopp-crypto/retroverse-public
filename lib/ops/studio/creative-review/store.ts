import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { loadRetrograph } from "@/lib/ops/studio/retrograph/store";
import { normalizeRvtr } from "@/lib/studio/status";

import { buildCreativeReview } from "./build-review";
import { creativeReviewOutputPath } from "./paths";
import type { CreativeReviewPackage, CreativeReviewSnapshot } from "./types";

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function loadCreativeReviewPackage(
  rvtrInput: string,
): Promise<CreativeReviewPackage | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;
  try {
    const raw = await readFile(creativeReviewOutputPath(rvtr), "utf8");
    return JSON.parse(raw) as CreativeReviewPackage;
  } catch {
    return null;
  }
}

export async function saveCreativeReviewPackage(pkg: CreativeReviewPackage): Promise<void> {
  await writeJson(creativeReviewOutputPath(pkg.rvtr), pkg);
}

export async function runCreativeReviewForRvtr(rvtrInput: string): Promise<CreativeReviewPackage | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  const [director, retrograph, songDna] = await Promise.all([
    loadDirectorPackage(rvtr),
    loadRetrograph(rvtr),
    loadSongDnaPackage(rvtr),
  ]);

  if (!director) return null;

  const pkg = buildCreativeReview({
    director,
    retrograph,
    hasSongDna: Boolean(songDna),
  });

  await saveCreativeReviewPackage(pkg);
  return pkg;
}

export async function loadCreativeReviewSnapshot(
  rvtrInput: string,
  options?: { refresh?: boolean },
): Promise<CreativeReviewSnapshot | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  let review = options?.refresh ? null : await loadCreativeReviewPackage(rvtr);
  const director = await loadDirectorPackage(rvtr);
  if (!director) return null;

  if (!review || review.directorGeneratedAt !== director.generatedAt) {
    review = await runCreativeReviewForRvtr(rvtr);
  }
  if (!review) return null;

  const [collector, editor] = await Promise.all([
    loadCollectorPackage(rvtr),
    loadEditorStory(rvtr),
  ]);

  const coverUrl =
    collector?.visualAssets?.coverUrl ?? editor?.approved.images[0]?.imageUrl ?? null;
  const album = collector?.identity?.albumTitle ?? collector?.charts?.albumTitle ?? null;
  const year = collector?.identity?.year ?? null;

  return {
    ...review,
    coverUrl,
    album,
    year,
    pageCount: director.storyPlan?.pages.length ?? director.experiencePlan.scenes.length,
    sceneCount: director.experiencePlan.scenes.length,
  };
}
