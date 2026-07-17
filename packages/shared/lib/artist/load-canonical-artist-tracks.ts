import "server-only";

import { cache } from "react";

import { inspectQuery } from "@/lib/inspect/pg";

export type CanonicalArtistTrackRow = {
  track_id: string;
  canonical_title: string;
  peak_hot100_position: number | null;
  chart_weeks: number;
  first_chart_date: string | null;
  has_vdj_media: boolean;
  has_hot100: boolean;
};

const ARTIST_TRACK_LIMIT = 500;

async function loadCanonicalArtistTracksImpl(
  artistId: number,
): Promise<CanonicalArtistTrackRow[]> {
  if (!Number.isInteger(artistId) || artistId <= 0) return [];

  return inspectQuery<CanonicalArtistTrackRow>(
    `
    SELECT track_id, canonical_title, peak_hot100_position, chart_weeks,
           first_chart_date::text AS first_chart_date, has_vdj_media, has_hot100
    FROM canonical_track_display
    WHERE artist_id = $1
    ORDER BY first_chart_date ASC NULLS LAST, canonical_title ASC
    LIMIT ${ARTIST_TRACK_LIMIT}
    `,
    [artistId],
  );
}

/** One request-cached canonical track set shared by every Artist section loader. */
export const loadCanonicalArtistTracks = cache(loadCanonicalArtistTracksImpl);
