/**
 * Canonical Song Experience — resolution wrapper.
 *
 * Prefer graph data, then package, then VDJ. Delegates assembly to
 * loadPublicSongPayload for a single normalized result.
 */
import "server-only";

import {
  loadPublicSongPayload,
  type PublicSongPayload,
  type PublicSongVdjHint,
} from "@/lib/retroverse/experience/load-public-song-payload";
import type { TrackPageData } from "@/lib/track/load-track-page";
import type { UniversalPackagePayload } from "@/lib/universal-renderer/load-package";

const RVTR_RE = /^RVTR\d{6}$/i;

export type CanonicalSongResolution =
  | { tier: "graph"; track: TrackPageData; payload: PublicSongPayload }
  | { tier: "package"; payload: PublicSongPayload; packagePayload: UniversalPackagePayload }
  | { tier: "vdj"; payload: PublicSongPayload; packagePayload: UniversalPackagePayload }
  | { tier: "partial"; payload: PublicSongPayload }
  | { tier: "empty"; rvtr: string; payload: PublicSongPayload };

export async function resolveCanonicalSongExperience(
  rvtrParam: string,
  vdjHint?: PublicSongVdjHint | null,
): Promise<CanonicalSongResolution> {
  const raw = decodeURIComponent(rvtrParam).trim();
  const rvtr = raw.toUpperCase();
  const payload = await loadPublicSongPayload(rvtrParam, vdjHint);

  if (!RVTR_RE.test(rvtr)) {
    return { tier: "empty", rvtr: raw, payload };
  }

  if (payload.track) {
    return { tier: "graph", track: payload.track, payload };
  }

  if (payload.universalPackage) {
    return { tier: "package", payload, packagePayload: payload.universalPackage };
  }

  if (payload.vdjPackage) {
    return { tier: "vdj", payload, packagePayload: payload.vdjPackage };
  }

  if (payload.resolution === "partial" && payload.title && payload.artist) {
    return { tier: "partial", payload };
  }

  return { tier: "empty", rvtr, payload };
}
