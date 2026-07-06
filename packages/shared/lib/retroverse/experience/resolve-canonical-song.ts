/**
 * Canonical Song Experience — package resolution.
 *
 * The Song Experience route (`/retroverse-2/song/[rvtr]`) is the one public
 * destination every live entry point resolves to. This module decides what
 * to render there by attempting, in order, the richest source that already
 * has content for the RVTR — never generating anything new.
 *
 *   1. Published/graph-backed track  (Postgres canonical_track_display)
 *   2. Any SongPackage on disk       (draft / review / cards_ready / published)
 *   3. VirtualDJ library entry       (Label field carries the RVTR)
 *   4. Nothing found                 (caller renders a minimal, honest empty state)
 *
 * Server-only.
 */
import "server-only";

import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";
import { loadUniversalPackage, type UniversalPackagePayload } from "@/lib/universal-renderer/load-package";
import { loadVdjBasePackageByRvtr } from "@/lib/universal-renderer/load-vdj-base";

const RVTR_RE = /^RVTR\d{6}$/i;

export type CanonicalSongResolution =
  | { tier: "graph"; track: TrackPageData }
  | { tier: "package"; payload: UniversalPackagePayload }
  | { tier: "vdj"; payload: UniversalPackagePayload }
  | { tier: "empty"; rvtr: string };

/**
 * Resolve the richest available content for an RVTR (or legacy slug).
 * Reuses the same loaders already powering `/song/[rvtr]` and
 * `/song/vdj/[key]` — no new generation, no new card types.
 */
export async function resolveCanonicalSongExperience(
  rvtrParam: string,
): Promise<CanonicalSongResolution> {
  const raw = decodeURIComponent(rvtrParam).trim();

  const track = await loadTrackPage(raw);
  if (track) return { tier: "graph", track };

  const rvtr = raw.toUpperCase();
  if (!RVTR_RE.test(rvtr)) {
    return { tier: "empty", rvtr: raw };
  }

  const packagePayload = await loadUniversalPackage(rvtr);
  if (packagePayload) return { tier: "package", payload: packagePayload };

  const vdjPayload = await loadVdjBasePackageByRvtr(rvtr);
  if (vdjPayload) return { tier: "vdj", payload: vdjPayload };

  return { tier: "empty", rvtr };
}
