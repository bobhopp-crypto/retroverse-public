import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import {
  winningArtworkPathSubquery,
  winningArtworkR2Subquery,
} from "@/lib/artwork/winning-artwork-link-sql";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { displayArtistName } from "@/lib/artist/slug";
import { loadVdjSnapshotsForPaths } from "./vdj-database";
import { loadRetroverseTagsStore, tagsForRvtr } from "@/lib/ops/retroverse-tags/store";
import { formatCanonicalTitle } from "@/lib/track/format-canonical-title";

import type { SongPackageMetadata } from "./song-package-types";

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

export async function loadSongMetadata(rvtrParam: string): Promise<SongPackageMetadata | null> {
  const rvtr = rvtrParam.trim().toUpperCase();
  if (!/^RVTR\d{6}$/.test(rvtr)) return null;

  const ping = await inspectPing();
  if (!ping.ok) return null;

  const trackRows = await inspectQuery<{
    track_id: string;
    canonical_title: string;
    canonical_artist_name: string;
    first_chart_date: string | null;
    peak_hot100_position: number | null;
    chart_weeks: number;
    has_vdj_media: boolean;
  }>(
    `
    SELECT track_id, canonical_title, canonical_artist_name, first_chart_date::text AS first_chart_date,
           peak_hot100_position, chart_weeks, has_vdj_media
    FROM canonical_track_display
    WHERE upper(trim(track_id)) = upper(trim($1))
       OR upper(trim(coalesce(retroverse_track_id, ''))) = upper(trim($1))
    LIMIT 1
    `,
    [rvtr],
  );

  const track = trackRows[0];
  if (!track) return null;

  const [albumRows, mediaRows, tagStore, relatedArtistRows] = await Promise.all([
    inspectQuery<{
      title: string;
      release_year: number | null;
      cover_path: string | null;
      artwork_path: string | null;
      r2_cover_key: string | null;
    }>(
      `
      SELECT al.title, al.release_year,
             al.canonical_cover_path AS cover_path,
             ${winningArtworkPathSubquery()},
             ${winningArtworkR2Subquery()}
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
      ORDER BY cat.position ASC
      LIMIT 1
      `,
      [rvtr],
    ),
    inspectQuery<{ source_path: string | null; filename: string | null }>(
      `
      SELECT ma.source_path, ma.filename
      FROM media_track_links mtl
      JOIN media_assets ma ON ma.id = mtl.media_asset_id
      JOIN canonical_track_display ctd ON ctd.track_id::text = mtl.track_id::text
      WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) = upper(trim($1))
      ORDER BY mtl.confidence_score DESC NULLS LAST, ma.id ASC
      LIMIT 1
      `,
      [rvtr],
    ),
    loadRetroverseTagsStore(),
    inspectQuery<{ artist_name: string }>(
      `
      SELECT DISTINCT ar.canonical_name AS artist_name
      FROM canonical_album_tracks cat
      JOIN canonical_album_tracks cat2 ON cat.album_id = cat2.album_id
        AND cat.track_id <> cat2.track_id
      JOIN tracks t ON t.id = cat2.track_id
      JOIN artists ar ON ar.id = t.artist_id
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
      ORDER BY ar.canonical_name ASC
      LIMIT 6
      `,
      [rvtr],
    ),
  ]);

  const album = albumRows[0];
  const coverUrl = resolveAlbumCoverUrlFromRow({
    cover_path: album?.cover_path,
    artwork_path: album?.artwork_path,
    r2_cover_key: album?.r2_cover_key,
  });

  const media = mediaRows[0];
  const filePath = media?.source_path?.trim() || null;
  let playCount: number | null = null;
  let vdjSnapshot = undefined;
  if (filePath) {
    const vdjMeta = await loadVdjSnapshotsForPaths([filePath]);
    const snap = vdjMeta.get(filePath.replace(/\\/g, "/").toLowerCase());
    playCount = snap?.playCount ?? null;
    vdjSnapshot = snap;
  }

  const tags = tagsForRvtr(tagStore, rvtr);
  const videoInfo = media
    ? [media.filename, media.source_path].filter(Boolean).join(" · ")
    : null;

  return {
    rvtr,
    artist: displayArtistName(track.canonical_artist_name.trim()),
    title: formatCanonicalTitle(track.canonical_title),
    year: album?.release_year ?? yearFromDate(track.first_chart_date),
    albumTitle: album?.title?.trim() || null,
    coverUrl,
    peakHot100: track.peak_hot100_position,
    chartWeeks: track.chart_weeks > 0 ? track.chart_weeks : null,
    playCount,
    tags,
    hasVdjMedia: track.has_vdj_media,
    videoInfo,
    relatedArtists: relatedArtistRows
      .map((r) => displayArtistName(r.artist_name.trim()))
      .filter((name) => name.toLowerCase() !== displayArtistName(track.canonical_artist_name).toLowerCase()),
    vdjSnapshot,
  };
}
