import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import {
  loadSongPackage,
  normalizePackageRvtr,
  saveSongPackage,
} from "@/lib/ops/intelligence/song-package-store";
import type {
  SongPackage,
  StoredVisualProfile,
} from "@/lib/ops/intelligence/song-package-types";

import type { BridgeVisualAction } from "./types";

function stripRuntimeFields(pkg: SongPackage): SongPackage {
  const { visualProfile: _visualProfile, ...rest } = pkg;
  return rest;
}

function storedProfile(pkg: SongPackage): StoredVisualProfile {
  return { ...(pkg.storedVisualProfile ?? {}) };
}

export async function applyBridgeVisualAction(
  rvtrParam: string,
  action: BridgeVisualAction,
): Promise<SongPackage | null> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return null;

  const raw = await loadSongPackage(rvtr);
  if (!raw) return null;

  const pkg = hydratePackageIntel(raw);
  const secondaryUrl = pkg.metadata.coverUrl?.trim() || null;
  const stored = storedProfile(pkg);

  if (action === "promote_secondary") {
    if (!secondaryUrl) {
      throw new Error("No secondary hero to promote.");
    }
    stored.primaryHeroUrl = secondaryUrl;
    stored.statusOverride = "complete";
  }

  if (action === "clear_primary") {
    stored.primaryHeroUrl = null;
    stored.statusOverride = secondaryUrl ? "legacy" : "missing";
  }

  if (action === "mark_needs_review") {
    stored.statusOverride = "needs_review";
  }

  const next = stripRuntimeFields({
    ...pkg,
    storedVisualProfile: stored,
    updatedAt: new Date().toISOString(),
  });

  const saved = await saveSongPackage(next);
  return hydratePackageIntel(saved);
}
