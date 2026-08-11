import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import {
  loadSongPackage,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { resolveVisualAssetPath } from "@/lib/ops/studio/collector/visual-extraction";

import { resolveHeroFromSongPackage } from "./hero-resolver";
import type { ResolvedHero } from "./types";

function experienceVisualAssetUrl(rvtr: string, filename: string): string {
  const params = new URLSearchParams({ rvtr: rvtr.trim().toUpperCase(), file: filename });
  return `/api/experience/visual-asset?${params.toString()}`;
}

/** Load package + track and resolve the best hero for an RVTR. */
export async function resolveHeroForRvtr(rvtrParam: string): Promise<ResolvedHero> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return { url: null, tier: null };

  const [rawPkg, track] = await Promise.all([
    loadSongPackage(rvtr).catch(() => null),
    loadTrackPage(rvtr).catch(() => null),
  ]);

  const pkg = rawPkg ? hydratePackageIntel(rawPkg) : null;
  const resolved = resolveHeroFromSongPackage(pkg, track?.coverUrl ?? null);
  if (resolved.url) return resolved;

  const videoHero = await resolveVisualAssetPath(rvtr, "hero-video.jpg");
  return videoHero
    ? { url: experienceVisualAssetUrl(rvtr, "hero-video.jpg"), tier: "primary" }
    : resolved;
}
