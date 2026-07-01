import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import {
  loadSongPackage,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import { loadTrackPage } from "@/lib/track/load-track-page";

import { resolveHeroFromSongPackage } from "./hero-resolver";
import type { ResolvedHero } from "./types";

/** Load package + track and resolve the best hero for an RVTR. */
export async function resolveHeroForRvtr(rvtrParam: string): Promise<ResolvedHero> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return { url: null, tier: null };

  const [rawPkg, track] = await Promise.all([
    loadSongPackage(rvtr).catch(() => null),
    loadTrackPage(rvtr).catch(() => null),
  ]);

  const pkg = rawPkg ? hydratePackageIntel(rawPkg) : null;
  return resolveHeroFromSongPackage(pkg, track?.coverUrl ?? null);
}
