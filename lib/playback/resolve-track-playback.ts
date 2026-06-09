import { cache } from "react";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import type { PlaybackResolveResult, PlaybackTarget } from "./types";

function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

const RE_RVTR = /^RVTR\d{6}$/i;

function youtubeSearchUrl(artist: string, title: string): string {
  const q = `${artist} ${title}`.trim() || title.trim() || "music";
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

async function resolveTrackPlaybackImpl(
  rvtrParam: string,
  fallback?: { title?: string; artist?: string },
): Promise<PlaybackResolveResult | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const rvtr = rvtrParam.trim().toUpperCase();
  if (!RE_RVTR.test(rvtr)) return null;

  const [trackRows, youtubeRows, mediaRows] = await Promise.all([
    inspectQuery<{
      canonical_title: string;
      canonical_artist_name: string;
      has_vdj_media: boolean;
    }>(
      `
      SELECT canonical_title, canonical_artist_name, has_vdj_media
      FROM canonical_track_display
      WHERE upper(trim(track_id)) = upper(trim($1))
         OR upper(trim(coalesce(retroverse_track_id, ''))) = upper(trim($1))
      LIMIT 1
      `,
      [rvtr],
    ),
    inspectQuery<{ youtube_id: string; title: string | null }>(
      `
      SELECT DISTINCT ON (yv.youtube_id)
             yv.youtube_id, yv.title
      FROM youtube_video_tracks yvt
      JOIN youtube_videos yv ON yv.youtube_id = yvt.youtube_video_id
      WHERE upper(trim(yvt.rvtr)) = upper(trim($1))
        AND yvt.review_flag IN ('approved', 'pending')
        AND yvt.confidence IN ('exact', 'high')
      ORDER BY
        yv.youtube_id,
        CASE yvt.confidence WHEN 'exact' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
        yvt.id ASC
      LIMIT 1
      `,
      [rvtr],
    ),
    inspectQuery<{ media_asset_id: number; r2_media_key: string | null; source_path: string | null }>(
      `
      SELECT ma.id AS media_asset_id, ma.r2_media_key, ma.source_path
      FROM media_track_links mtl
      JOIN media_assets ma ON ma.id = mtl.media_asset_id
      JOIN canonical_track_display ctd ON ctd.track_id::text = mtl.track_id::text
      WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) = upper(trim($1))
      ORDER BY mtl.confidence_score DESC NULLS LAST, ma.id ASC
      LIMIT 1
      `,
      [rvtr],
    ),
  ]);

  const track = trackRows[0];
  const title = track?.canonical_title?.trim() || fallback?.title?.trim() || rvtr;
  const artist = track?.canonical_artist_name?.trim() || fallback?.artist?.trim() || "";
  const hasVdjMedia = track?.has_vdj_media === true || mediaRows.length > 0;

  let target: PlaybackTarget | null = null;

  const yt = youtubeRows[0];
  if (yt?.youtube_id) {
    target = {
      source: "youtube",
      url: youtubeWatchUrl(yt.youtube_id),
      youtubeId: yt.youtube_id,
    };
  }

  const media = mediaRows[0];
  if (!target && media?.r2_media_key?.trim()) {
    target = {
      source: "media_asset",
      url: media.r2_media_key.trim(),
      mediaAssetId: media.media_asset_id,
    };
  }

  if (!target) {
    target = {
      source: "search",
      url: youtubeSearchUrl(artist, title),
    };
  }

  return { rvtr, title, artist, target, hasVdjMedia };
}

export const resolveTrackPlayback = cache(resolveTrackPlaybackImpl);
