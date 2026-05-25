import { cache } from "react";

import { coverPathToUrl } from "@/lib/artist/cover-url";
import { resolveArtistFromSlug } from "@/lib/artist/resolve-artist";
import { artistFileCode } from "@/lib/artist/slug";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

export type ArtistExhibitShellData = {
  slug: string;
  displayName: string;
  fileCode: string;
  heroImageUrl: string | null;
};

function pickHeroCover(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (!c?.trim()) continue;
    const url = coverPathToUrl(c) ?? coverPathToUrl(null, c);
    if (url) return url;
  }
  return null;
}

async function loadArtistExhibitShellImpl(
  slug: string,
): Promise<ArtistExhibitShellData | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const resolved = await resolveArtistFromSlug(slug);
  if (!resolved) return null;

  const coverRows = await inspectQuery<{ cover_path: string | null }>(
    `
    SELECT al.canonical_cover_path AS cover_path
    FROM albums al
    LEFT JOIN chart_appearances ca ON ca.album_id = al.id
    WHERE al.artist_id = $1 AND al.canonical_cover_path IS NOT NULL
    GROUP BY al.id, al.canonical_cover_path, al.release_year
    ORDER BY
      min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') ASC NULLS LAST,
      al.release_year DESC NULLS LAST,
      al.id DESC
    LIMIT 1
    `,
    [resolved.artistId],
  );

  return {
    slug: resolved.slug,
    displayName: resolved.displayName,
    fileCode: artistFileCode(resolved.artistId, resolved.displayName),
    heroImageUrl: pickHeroCover(coverRows[0]?.cover_path),
  };
}

export const loadArtistExhibitShell = cache(loadArtistExhibitShellImpl);
