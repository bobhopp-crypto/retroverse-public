/**
 * Broadcast integration with the existing RetroVerse song package system.
 *
 * Reuses the same tiers `resolveCanonicalSongExperience` tries for
 * `/retroverse-2/song/[rvtr]` — bundled SongPackage JSON first, then the
 * VirtualDJ library fallback — skipping only the Postgres-backed graph
 * tier. No new package generation, no new card types, no second renderer.
 *
 * Server-only (filesystem / VDJ database access).
 */
import "server-only";

import { loadUniversalPackage, type UniversalPackagePayload } from "@/lib/universal-renderer/load-package";
import { loadVdjBasePackageByRvtr } from "@/lib/universal-renderer/load-vdj-base";

/**
 * The existing song package for an RVTR, if one exists. Null means: no
 * package or VDJ fallback found — the caller shows the plain placeholder.
 */
export async function loadNowPlayingPackage(
  rvtr: string,
): Promise<UniversalPackagePayload | null> {
  const bundled = await loadUniversalPackage(rvtr);
  if (bundled) return bundled;
  return loadVdjBasePackageByRvtr(rvtr);
}
