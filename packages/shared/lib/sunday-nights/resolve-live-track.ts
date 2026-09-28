import { loadTrackPage } from "@/lib/track/load-track-page";
import { resolveHeroForRvtr } from "@/lib/visual-profile/resolve-hero-for-rvtr";

import { loadRvtrAliasStore, lookupAliasRvtrFromStore } from "./rvtr-aliases";
import type { LiveResolution } from "./types";

const RE_RVTR = /^RVTR\d{6}$/i;
const RE_VDJ = /^vdj:[0-9a-f]{16}$/i;

/** Canonical live track id — RVTR or `vdj:{16-hex-key}`. */
export function normalizeLiveTrackId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (RE_RVTR.test(trimmed)) return trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  if (RE_VDJ.test(lower)) return lower;
  return null;
}

function normPath(p: string): string {
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

export type LiveTrackResolution = {
  rvtr: string | null;
  resolution: LiveResolution;
  year: number | null;
  coverUrl: string | null;
};

export async function resolveLiveTrack(input: {
  filepath: string;
  artist: string;
  title: string;
}): Promise<LiveTrackResolution> {
  const artist = input.artist.trim();
  const title = input.title.trim();

  let rvtr: string | null = null;
  let resolution: LiveResolution = "unresolved";

  // The Mac bridge supplies an authoritative RVTR label when one exists.
  // Unlabeled tracks may use only the checked-in alias store; no graph query.
  const aliasStore = await loadRvtrAliasStore();
  const fromAlias = lookupAliasRvtrFromStore(aliasStore, artist, title);
  if (fromAlias) {
    rvtr = fromAlias;
    resolution = "fallback";
  }

  if (rvtr) {
    const [track, hero] = await Promise.all([
      loadTrackPage(rvtr),
      resolveHeroForRvtr(rvtr),
    ]);
    if (track) {
      return {
        rvtr,
        resolution,
        year: track.releaseYear,
        coverUrl: hero.url,
      };
    }
  }

  return {
    rvtr,
    resolution,
    year: null,
    coverUrl: null,
  };
}

export function normMediaPath(p: string): string {
  return normPath(p);
}

export function songKeyFromPath(filepath: string): string {
  return normPath(filepath);
}
