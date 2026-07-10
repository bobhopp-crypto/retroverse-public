import "server-only";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { hashBuffer, probeAndThumbnail } from "./media";
import { buildCollectionId, buildRvbaId } from "./rvba-id";
import { detectSequences } from "./sequence-detect";
import { sortByNumericFilename } from "./sort";
import { getImportSource } from "./sources";
import { collectionMastersDir, collectionThumbsDir, loadManifest, saveManifest } from "./store";
import type {
  BroadcastCollectionManifest,
  ImportBroadcastCollectionOptions,
  RvbaSlideAsset,
} from "./types";
import { invalidateManifestCache } from "./lookup";

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.(png|jpe?g)$/i, "")
    .replace(/^\s*(slide|scene|img|image)?\s*\d+\s*[-_.:]?\s*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Import a Broadcast Collection from any registered source. Every image
 * becomes its own RVBA slide asset; a first-pass Sequence grouping is
 * auto-detected. This is the one function both the CLI and the Mixer's
 * "Import Collection" action call — there is no Live-Aid-specific code path.
 */
export async function importBroadcastCollection(
  options: ImportBroadcastCollectionOptions,
): Promise<BroadcastCollectionManifest> {
  const collectionId = options.collectionId ?? buildCollectionId(options.collectionTitle);
  const source = getImportSource(options.sourceKind);

  const rawImages = await source.listImages(options.input);
  if (rawImages.length === 0) {
    throw new Error(`No PNG/JPG images found in the ${options.sourceKind} source.`);
  }
  const sortedImages = sortByNumericFilename(rawImages);

  await mkdir(collectionMastersDir(collectionId), { recursive: true });
  await mkdir(collectionThumbsDir(collectionId), { recursive: true });

  const slides: RvbaSlideAsset[] = [];
  for (let i = 0; i < sortedImages.length; i += 1) {
    const image = sortedImages[i]!;
    const sequenceIndex = i + 1;
    const rvbaId = buildRvbaId(collectionId, sequenceIndex);
    const hash = hashBuffer(image.buffer);
    const { width, height, thumbnail } = await probeAndThumbnail(image.buffer);

    const stamp = `${String(sequenceIndex).padStart(3, "0")}-${hash}`;
    const masterFile = `${stamp}.png`;
    const thumbFile = `${stamp}.jpg`;
    await writeFile(join(collectionMastersDir(collectionId), masterFile), image.buffer);
    await writeFile(join(collectionThumbsDir(collectionId), thumbFile), thumbnail);

    slides.push({
      rvbaId,
      collectionId,
      sequenceIndex,
      filename: image.filename,
      title: titleFromFilename(image.filename) || `Slide ${sequenceIndex}`,
      width,
      height,
      hash,
      masterFile,
      thumbFile,
    });
  }

  const sequences = detectSequences(sortedImages, {
    defaultDurationSeconds: options.defaultDurationSeconds ?? 8,
  });

  const existing = await loadManifest(collectionId);
  const now = new Date().toISOString();
  const manifest: BroadcastCollectionManifest = {
    id: collectionId,
    title: options.collectionTitle,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sourceKind: options.sourceKind,
    slides,
    sequences,
  };

  await saveManifest(manifest);
  invalidateManifestCache(collectionId);
  return manifest;
}
