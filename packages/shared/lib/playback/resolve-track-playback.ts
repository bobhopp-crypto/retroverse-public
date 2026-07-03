import { existsSync } from "node:fs";
import { cache } from "react";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { isOpsPlayableVideoPath, opsVideoMediaAndClause } from "@/lib/ops/ops-video-media";

import {
  buildLocalStreamUrl,
  mediaKeyToStreamUrl,
  youtubeEmbedUrl,
} from "./media-delivery";
import type { PlaybackProvider, PlaybackResolveResult, PlaybackTarget } from "./types";

const RE_RVTR = /^RVTR\d{6}$/i;

function performanceLabel(provider: PlaybackProvider): "Play" | "Watch Performance" {
  return provider === "youtube" || provider === "vimeo" || provider === "archive"
    ? "Watch Performance"
    : "Play";
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
    }>(
      `
      SELECT canonical_title, canonical_artist_name
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
    ).catch(() => [] as { youtube_id: string; title: string | null }[]),
    inspectQuery<{
      media_asset_id: number;
      r2_media_key: string | null;
      source_path: string | null;
    }>(
      `
      SELECT ma.id AS media_asset_id, ma.r2_media_key, ma.source_path
      FROM media_track_links mtl
      JOIN media_assets ma ON ma.id = mtl.media_asset_id
      JOIN canonical_track_display ctd ON ctd.track_id::text = mtl.track_id::text
      WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) = upper(trim($1))
      ${opsVideoMediaAndClause("ma")}
      ORDER BY mtl.confidence_score DESC NULLS LAST, ma.id ASC
      LIMIT 1
      `,
      [rvtr],
    ),
  ]);

  const track = trackRows[0];
  const title = track?.canonical_title?.trim() || fallback?.title?.trim() || rvtr;
  const artist = track?.canonical_artist_name?.trim() || fallback?.artist?.trim() || "";
  const hasVdjMedia = mediaRows.length > 0;

  let target: PlaybackTarget | null = null;

  const media = mediaRows[0];
  if (media) {
    const localPath = media.source_path?.trim();
    if (localPath && isOpsPlayableVideoPath(localPath) && existsSync(localPath)) {
      target = {
        provider: "vdj_local",
        streamUrl: buildLocalStreamUrl(rvtr, media.media_asset_id),
        mediaAssetId: media.media_asset_id,
      };
    } else {
      const hosted = mediaKeyToStreamUrl(media.r2_media_key);
      if (hosted) {
        target = {
          provider: "mp4",
          streamUrl: hosted,
          mediaAssetId: media.media_asset_id,
        };
      }
    }
  }

  const yt = youtubeRows[0];
  if (!target && yt?.youtube_id) {
    target = {
      provider: "youtube",
      embedUrl: youtubeEmbedUrl(yt.youtube_id),
      youtubeId: yt.youtube_id,
    };
  }

  const canPlay = Boolean(target);
  const playLabel = target ? performanceLabel(target.provider) : "Play";

  return { rvtr, title, artist, target, hasVdjMedia, canPlay, playLabel };
}

export const resolveTrackPlayback = cache(resolveTrackPlaybackImpl);
