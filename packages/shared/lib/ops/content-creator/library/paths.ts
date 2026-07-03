import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

/** `RETROVERSE_DATA/content_creator` — durable generation library. */
export function contentCreatorRoot(): string {
  return join(retroverseDataRoot(), "content_creator");
}

export function contentCreatorGenerationsDir(): string {
  return join(contentCreatorRoot(), "generations");
}

export function contentCreatorExportsDir(): string {
  return join(contentCreatorRoot(), "exports");
}

export function contentCreatorManifestsDir(): string {
  return join(contentCreatorRoot(), "manifests");
}

export function contentCreatorThumbnailsDir(): string {
  return join(contentCreatorRoot(), "thumbnails");
}

export function contentCreatorIndexPath(): string {
  return join(contentCreatorManifestsDir(), "index.json");
}

export function contentCreatorManifestPath(generationId: string): string {
  return join(contentCreatorManifestsDir(), `${generationId}.json`);
}

/** `generations/YYYY-MM-DD/{id}/` */
export function contentCreatorGenerationDayDir(isoDate: string, generationId: string): string {
  const day = isoDate.slice(0, 10);
  return join(contentCreatorGenerationsDir(), day, generationId);
}

export function contentCreatorExportDir(generationId: string): string {
  return join(contentCreatorExportsDir(), generationId);
}

export function contentCreatorThumbnailPath(generationId: string): string {
  return join(contentCreatorThumbnailsDir(), `${generationId}.jpg`);
}
