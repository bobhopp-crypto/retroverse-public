import "server-only";

import { libraryFileUrl, loadGenerationManifest, loadLibraryIndex } from "@/lib/ops/content-creator/library";

import { passTypeSlugFromLabel } from "./placeholder-artwork.server";

export type PassArtworkSlug = "general" | "vip" | "backstage";

export type PassArtworkMatch = {
  generationId: string;
  frontArtworkUrl: string;
  backArtworkUrl: string;
  event: string;
  date: string;
  updatedAt: string;
};

export type PassArtworkBySlug = Partial<Record<PassArtworkSlug, PassArtworkMatch>>;

/**
 * Content Creator (`RETROVERSE_DATA/content_creator/`) is the single shared artwork
 * library for all BobOS apps. Pass Studio never copies these PNGs — it only reads
 * the index + manifests and links to the existing files via `libraryFileUrl`.
 */
export async function findLatestPassArtworkBySlug(): Promise<PassArtworkBySlug> {
  const index = await loadLibraryIndex();
  const passEntries = index.generations.filter((g) => g.artifact === "pass" && g.status !== "archived");

  const result: PassArtworkBySlug = {};
  const remaining = new Set<PassArtworkSlug>(["general", "vip", "backstage"]);

  for (const entry of passEntries) {
    if (remaining.size === 0) break;

    const manifest = await loadGenerationManifest(entry.id);
    if (!manifest || !manifest.frontImagePath || !manifest.backImagePath) continue;

    const slug = passTypeSlugFromLabel(manifest.passTypeLabel);
    if (!remaining.has(slug)) continue;

    result[slug] = {
      generationId: manifest.id,
      frontArtworkUrl: libraryFileUrl(manifest.frontImagePath),
      backArtworkUrl: libraryFileUrl(manifest.backImagePath),
      event: manifest.event,
      date: manifest.date,
      updatedAt: manifest.updatedAt,
    };
    remaining.delete(slug);
  }

  return result;
}

/** Resolve a specific generation's artwork — used to re-hydrate a template that already points at one. */
export async function resolveGenerationArtwork(
  generationId: string,
): Promise<{ frontArtworkUrl: string | null; backArtworkUrl: string | null } | null> {
  const manifest = await loadGenerationManifest(generationId);
  if (!manifest) return null;
  return {
    frontArtworkUrl: manifest.frontImagePath ? libraryFileUrl(manifest.frontImagePath) : null,
    backArtworkUrl: manifest.backImagePath ? libraryFileUrl(manifest.backImagePath) : null,
  };
}
