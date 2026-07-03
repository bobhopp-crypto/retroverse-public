import { cache } from "react";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { artistMatchKeys, normalizeArtistMatchKey } from "@/lib/search/canonicalize-search";

async function loadArtistYoutubeVideoCountImpl(artistName: string): Promise<number> {
  const ping = await inspectPing();
  if (!ping.ok) return 0;

  const keys = artistMatchKeys(artistName).map(normalizeArtistMatchKey).filter(Boolean);
  if (keys.length === 0) return 0;

  try {
    const rows = await inspectQuery<{ n: number }>(
      `
      SELECT COUNT(DISTINCT yvt.youtube_video_id)::int AS n
      FROM youtube_video_tracks yvt
      JOIN canonical_track_display ctd ON upper(trim(ctd.track_id)) = upper(trim(yvt.rvtr))
      WHERE yvt.rvtr IS NOT NULL
        AND yvt.confidence IN ('exact', 'high')
        AND yvt.review_flag = 'approved'
        AND lower(regexp_replace(trim(ctd.canonical_artist_name), '^the\\s+', '', 'i')) = ANY($1::text[])
      `,
      [keys],
    );
    return rows[0]?.n ?? 0;
  } catch {
    return 0;
  }
}

export const loadArtistYoutubeVideoCount = cache(loadArtistYoutubeVideoCountImpl);
