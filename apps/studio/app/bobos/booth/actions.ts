"use server";

import {
  loadSongPackageIndex,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export type BoothVdjEnrichment = {
  album: string | null;
  packageStatus: string | null;
};

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("The Booth is localhost-only.");
  }
}

/**
 * Optional enrichment for a VirtualDJ Source already observed via Runtime.
 * Reuses track page + song package index — no new bridge / no publish.
 */
export async function fetchBoothVdjEnrichment(
  rvtrParam: string | null,
): Promise<BoothVdjEnrichment> {
  assertLocalStudio();

  const rvtr = rvtrParam ? normalizePackageRvtr(rvtrParam) : null;
  if (!rvtr) {
    return { album: null, packageStatus: null };
  }

  const [track, index] = await Promise.all([loadTrackPage(rvtr), loadSongPackageIndex()]);
  const entry = index.packages.find((pkg) => normalizePackageRvtr(pkg.rvtr) === rvtr);

  return {
    album: track?.primaryAlbum?.title ?? null,
    packageStatus: entry?.status ?? null,
  };
}
