import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import {
  loadSongPackage,
  loadSongPackageIndex,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import { loadTrackPage } from "@/lib/track/load-track-page";
import {
  buildVisualProfileFromCoverUrl,
  buildVisualProfileFromPackage,
} from "@/lib/visual-profile/build-visual-profile";
import { resolveBestHero } from "@/lib/visual-profile/hero-resolver";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

import type { BridgeLiveState, BridgeSongModel } from "./types";

function neighborRvtrs(
  rvtr: string,
  packages: Array<{ rvtr: string }>,
): { prev: string | null; next: string | null } {
  const ids = packages.map((p) => p.rvtr);
  const index = ids.indexOf(rvtr);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? ids[index - 1]! : null,
    next: index < ids.length - 1 ? ids[index + 1]! : null,
  };
}

export async function resolveBridgeLiveRvtr(): Promise<BridgeLiveState> {
  const state = await loadSundayNightsState();
  const rvtr = state.currentTrackId ?? state.live?.rvtr ?? null;
  if (!rvtr) {
    return { rvtr: null, label: "No Live Track" };
  }
  return { rvtr, label: state.live?.title ?? rvtr };
}

export async function loadBridgeView(rvtrParam: string): Promise<BridgeSongModel | null> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return null;

  const [rawPkg, track, index] = await Promise.all([
    loadSongPackage(rvtr),
    loadTrackPage(rvtr).catch(() => null),
    loadSongPackageIndex(),
  ]);

  const { prev, next } = neighborRvtrs(rvtr, index.packages);

  if (!rawPkg && !track) return null;

  const pkg = rawPkg ? hydratePackageIntel(rawPkg) : null;
  const fallback = track?.coverUrl ?? null;
  const visualProfile = pkg
    ? (pkg.visualProfile ?? buildVisualProfileFromPackage(pkg))
    : buildVisualProfileFromCoverUrl(fallback);
  const resolvedHero = resolveBestHero(visualProfile, fallback);

  return {
    rvtr,
    title: pkg?.metadata.title ?? track?.title ?? rvtr,
    artist: pkg?.metadata.artist ?? track?.artistName ?? "—",
    year: pkg?.metadata.year ?? track?.releaseYear ?? null,
    playCount: pkg?.metadata.playCount ?? null,
    hasPackage: Boolean(pkg),
    visualProfile,
    resolvedHero,
    prevRvtr: prev,
    nextRvtr: next,
  };
}

export async function defaultBridgeRvtr(): Promise<string | null> {
  const live = await resolveBridgeLiveRvtr();
  if (live.rvtr) return live.rvtr;

  const index = await loadSongPackageIndex();
  return index.packages[0]?.rvtr ?? null;
}
