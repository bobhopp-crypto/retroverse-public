import { assessCompilationRisk } from "@/lib/healing/compilation-risk";
import type { MbIngestSafetyResult, PilotMbRow } from "@/lib/healing/mb-ingest/types";
import { inspectQuery } from "@/lib/inspect/pg";
import {
  normalizeTrackTitleKey,
  titlesLikelyMatch,
} from "@/lib/track/album-link-recovery/normalize-title";

const COMPILATION_RE =
  /\b(megamix|dj.?mix|promo only|hottest 100|now that|greatest hits|best of|collection|compilation|karaoke|tribute|expansion pack|radio edit|remix|live at|soundtrack|various artists|sampler|party mix|hit connection|mixtape|festival)\b/i;

const NON_STUDIO_RE =
  /\b(session|live from|promo only|itunes|bonnaroo|madison square|acoustic cafe)\b/i;

function normAlbumKey(title: string): string {
  return normalizeTrackTitleKey(title);
}

export function isCanaryStudioAlbum(
  albumTitle: string,
  artistName: string,
): { ok: boolean; reason?: string } {
  if (!albumTitle.trim()) return { ok: false, reason: "missing_album_title" };
  if (/^100%/i.test(albumTitle)) return { ok: false, reason: "compilation_100_percent_title" };
  if (COMPILATION_RE.test(albumTitle)) return { ok: false, reason: "compilation_title_pattern" };
  if (NON_STUDIO_RE.test(albumTitle)) return { ok: false, reason: "non_studio_release_shape" };
  const risk = assessCompilationRisk(albumTitle, artistName);
  if (risk.level === "high") {
    return { ok: false, reason: `release_shape_${risk.label.replace(/\s+/g, "_").toLowerCase()}` };
  }
  return { ok: true };
}

export async function checkMbIngestSafety(
  row: PilotMbRow,
): Promise<MbIngestSafetyResult> {
  const rvtr = row.rvtr.trim().toUpperCase();
  const albumTitle = row.mb.album?.trim() ?? "";
  const artistName = row.artist_name.trim();
  const signals = [...row.signals];

  if (!row.artist_id) {
    return { ok: false, reason: "missing_artist_id" };
  }
  if (!row.mb.complete || !row.mb.mbReleaseId) {
    return { ok: false, reason: "incomplete_mb_metadata" };
  }
  if (!row.autoIngestable || row.confidence !== "high") {
    return { ok: false, reason: "not_high_confidence_auto" };
  }

  const studio = isCanaryStudioAlbum(albumTitle, artistName);
  if (!studio.ok) return { ok: false, reason: studio.reason! };

  if (row.mb.tracklist.length < 8) {
    return { ok: false, reason: "tracklist_too_short" };
  }
  if (row.mb.trackPosition == null || !row.mb.trackTitleOnAlbum) {
    return { ok: false, reason: "missing_track_position" };
  }

  const trackHit = row.mb.tracklist.some((slot) =>
    titlesLikelyMatch(row.title, slot.title),
  );
  if (!trackHit) {
    return { ok: false, reason: "track_not_on_proposed_tracklist" };
  }

  const linked = await inspectQuery<{ rvtr: string }>(
    `
    SELECT upper(trim(canonical_track_key)) AS rvtr
    FROM canonical_album_tracks
    WHERE upper(trim(canonical_track_key)) = $1
    LIMIT 1
    `,
    [rvtr],
  );
  if (linked.length > 0) {
    return { ok: false, reason: "rvtr_already_linked" };
  }

  const albumKey = normAlbumKey(albumTitle);
  const existingAlbum = await inspectQuery<{ album_id: number; title: string }>(
    `
    SELECT al.id AS album_id, al.title
    FROM albums al
    WHERE al.artist_id = $1
      AND lower(regexp_replace(trim(al.title), '[^a-z0-9]+', ' ', 'g'))
        = lower(regexp_replace($2::text, '[^a-z0-9]+', ' ', 'g'))
    LIMIT 1
    `,
    [row.artist_id, albumTitle],
  );
  if (existingAlbum.length > 0) {
    return { ok: false, reason: "existing_album_for_artist_title" };
  }

  if (row.mb.releaseYear != null && row.chart_year != null) {
    const delta = Math.abs(row.chart_year - row.mb.releaseYear);
    if (delta > 1) {
      return { ok: false, reason: `year_delta_${delta}` };
    }
    signals.push(`year_delta_${delta}`);
  }

  signals.push("studio_album_shape");
  signals.push("track_on_tracklist");
  signals.push(`track_position_${row.mb.trackPosition}`);
  signals.push(`tracklist_${row.mb.tracklist.length}`);

  return {
    ok: true,
    qualifyReason:
      "High-confidence pilot row: studio album, year Δ≤1, tracklist ≥8, RVTR unlinked, no existing album",
    signals,
  };
}
