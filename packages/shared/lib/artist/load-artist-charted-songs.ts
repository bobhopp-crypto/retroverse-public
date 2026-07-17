import { cache } from "react";

import { inspectPing } from "@/lib/inspect/pg";
import { loadCanonicalArtistTracks } from "@/lib/artist/load-canonical-artist-tracks";
import { resolveArtistFromSlug } from "@/lib/artist/resolve-artist";
import { resolveCanonicalTracksBatch } from "@/lib/public/canonical-public-resolver";
import { trackPageHref } from "@/lib/search/entity-routes";

import type { ArtistChartedSong, ArtistChartedSongsData } from "./charted-song-types";

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

function fallbackChartedSongs(slugParam: string): ArtistChartedSongsData {
  const key = /^\d+$/.test(slugParam.trim()) ? slugParam.trim() : "0";
  const displayName = "Unknown artist";

  return {
    slug: key,
    displayName,
    songs: [],
  };
}

async function loadArtistChartedSongsImpl(slug: string): Promise<ArtistChartedSongsData> {
  const ping = await inspectPing();
  if (!ping.ok) return fallbackChartedSongs(slug);

  const resolved = await resolveArtistFromSlug(slug);
  if (!resolved) return fallbackChartedSongs(slug);

  const { artistId, displayName, slug: canonicalSlug } = resolved;

  const trackRows = (await loadCanonicalArtistTracks(artistId)).filter(
    (row) => row.has_hot100 && row.peak_hot100_position != null,
  );

  if (trackRows.length === 0) {
    return { slug: canonicalSlug, displayName, songs: [] };
  }

  const rvtrs = trackRows.map((row) => row.track_id.trim().toUpperCase());
  const canonicalTracks = await resolveCanonicalTracksBatch(rvtrs);
  const albumByTrack = new Map(
    [...canonicalTracks].map(([rvtr, track]) => [
      rvtr,
      track.albumResolution.primaryAlbum?.title ?? null,
    ]),
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
