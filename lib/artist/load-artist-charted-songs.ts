import { cache } from "react";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { resolveArtistFromSlug } from "@/lib/artist/resolve-artist";
import { artistNameFromSlug, displayArtistName, slugFromArtistName } from "@/lib/artist/slug";
import { trackPageHref } from "@/lib/search/entity-routes";

import type { ArtistChartedSong, ArtistChartedSongsData } from "./charted-song-types";

const CHARTED_SONGS_LIMIT = 500;

const ARTIST_NAME_MATCH = `
  lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i'))
  = lower(regexp_replace(trim($1), '^the\\s+', '', 'i'))
`;

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

function fallbackChartedSongs(slugParam: string): ArtistChartedSongsData {
  const key = slugParam.trim().toLowerCase();
  const knownName = artistNameFromSlug(key);
  const displayName = knownName
    ? displayArtistName(knownName)
    : displayArtistName(key.replace(/-/g, " "));

  return {
    slug: key || slugFromArtistName(displayName),
    displayName,
    songs: [],
  };
}

async function loadArtistChartedSongsImpl(slug: string): Promise<ArtistChartedSongsData> {
  const ping = await inspectPing();
  if (!ping.ok) return fallbackChartedSongs(slug);

  const resolved = await resolveArtistFromSlug(slug);
  if (!resolved) return fallbackChartedSongs(slug);

  const { canonicalName, displayName, slug: canonicalSlug } = resolved;

  const trackRows = await inspectQuery<{
    track_id: string;
    canonical_title: string;
    peak_hot100_position: number | null;
    chart_weeks: number;
    first_chart_date: string | null;
    has_vdj_media: boolean;
  }>(
    `
    SELECT track_id, canonical_title, peak_hot100_position, chart_weeks,
           first_chart_date::text AS first_chart_date, has_vdj_media
    FROM canonical_track_display
    WHERE ${ARTIST_NAME_MATCH}
      AND has_hot100 = true
      AND peak_hot100_position IS NOT NULL
    ORDER BY peak_hot100_position ASC NULLS LAST,
             chart_weeks DESC,
             canonical_title ASC
    LIMIT ${CHARTED_SONGS_LIMIT}
    `,
    [canonicalName],
  );

  if (trackRows.length === 0) {
    return { slug: canonicalSlug, displayName, songs: [] };
  }

  const rvtrs = trackRows.map((row) => row.track_id.trim().toUpperCase());
  const albumRows = await inspectQuery<{ track_key: string; album_title: string }>(
    `
    SELECT DISTINCT ON (cat.canonical_track_key)
      cat.canonical_track_key AS track_key,
      al.title AS album_title
    FROM canonical_album_tracks cat
    JOIN albums al ON al.id = cat.album_id
    WHERE cat.canonical_track_key = ANY($1::text[])
    ORDER BY cat.canonical_track_key, cat.position ASC
    `,
    [rvtrs],
  );

  const albumByTrack = new Map(
    albumRows.map((row) => [row.track_key.toUpperCase(), row.album_title.trim()]),
  );

  const songs: ArtistChartedSong[] = trackRows.map((row) => {
    const rvtr = row.track_id.trim().toUpperCase();
    return {
      rvtr,
      title: row.canonical_title.trim(),
      albumTitle: albumByTrack.get(rvtr) ?? null,
      firstChartYear: yearFromDate(row.first_chart_date),
      firstChartDate: row.first_chart_date?.trim() || null,
      peakHot100: row.peak_hot100_position,
      chartWeeks: row.chart_weeks,
      inLibrary: row.has_vdj_media,
      trackHref: trackPageHref(rvtr),
    };
  });

  return { slug: canonicalSlug, displayName, songs };
}

export const loadArtistChartedSongs = cache(loadArtistChartedSongsImpl);
