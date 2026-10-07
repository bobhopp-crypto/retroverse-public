import "server-only";

import { COMPANION_STILL_LOOKUP_LIMIT } from "@/lib/artist/companion-still-targets";
import { resolveVisualAssetPath } from "@/lib/ops/studio/collector/visual-extraction";

const RVTR_RE = /^RVTR\d{6}$/i;
const STILL_FILE = "hero-video.jpg";

function stillHref(rvtr: string): string {
  const params = new URLSearchParams({ rvtr, file: STILL_FILE });
  return `/api/experience/visual-asset?${params.toString()}`;
}

/** Public URL for a companion still that already sits beside a VIDEO asset. */
export async function loadCompanionStillUrls(rvtrs: string[]): Promise<Map<string, string>> {
  const unique = [
    ...new Set(
      rvtrs
        .map((rvtr) => rvtr.trim().toUpperCase())
        .filter((rvtr) => RVTR_RE.test(rvtr)),
    ),
  ].slice(0, COMPANION_STILL_LOOKUP_LIMIT);

  const found = await Promise.all(
    unique.map(async (rvtr) => {
      try {
        const path = await resolveVisualAssetPath(rvtr, STILL_FILE);
        return path ? ([rvtr, stillHref(rvtr)] as const) : null;
      } catch {
        return null;
      }
    }),
  );

  return new Map(found.filter((row): row is readonly [string, string] => row != null));
}
