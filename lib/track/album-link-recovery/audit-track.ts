import { inspectQuery } from "@/lib/inspect/pg";
import {
  countExistingAlbumLinks,
  fetchAlbumLinkCandidates,
  loadTrackForRecovery,
} from "@/lib/track/album-link-recovery/fetch-candidates";
import { rankCandidates } from "@/lib/track/album-link-recovery/score-candidate";
import type {
  AlbumLinkGapKind,
  TrackAlbumLinkAudit,
} from "@/lib/track/album-link-recovery/types";

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

function buildDiagnosis(
  rvtr: string,
  existingLinkCount: number,
  candidates: TrackAlbumLinkAudit["candidates"],
  firstChartYear: number | null,
): string[] {
  const lines: string[] = [];
  if (existingLinkCount > 0) {
    lines.push(`Already has ${existingLinkCount} canonical_album_tracks row(s).`);
    return lines;
  }

  lines.push(
    "No canonical_album_tracks rows for this RVTR — track page cover/album shelf cannot hydrate.",
  );

  const top = candidates[0];
  if (!top) {
    lines.push("No album candidates found in graph (missing artist albums + tracklist title matches).");
    lines.push("Likely needs album ingest or manual curator link.");
    return lines;
  }

  if (top.confidence >= 0.75) {
    lines.push(
      `Strong candidate: album_id=${top.albumId} "${top.albumTitle}" (${top.artistName}) confidence=${top.confidence}.`,
    );
  } else if (top.confidence >= 0.45) {
    lines.push(
      `Weak candidate only: album_id=${top.albumId} — review before any write (${top.reasons.join(", ")}).`,
    );
  } else {
    lines.push("Candidates exist but confidence is low — do not auto-link.");
  }

  if (firstChartYear != null && top.releaseYear != null) {
    const delta = Math.abs(firstChartYear - top.releaseYear);
    if (delta > 8) {
      lines.push(
        `Chart debut ${firstChartYear} vs album year ${top.releaseYear} (Δ${delta}) — verify not a later compilation.`,
      );
    }
  }

  if (top.existingRvtrOnSlot && top.existingRvtrOnSlot !== rvtr) {
    lines.push(
      `Tracklist slot exists but is keyed to ${top.existingRvtrOnSlot} — merge review required.`,
    );
  }

  return lines;
}

export async function auditTrackAlbumLinks(
  rvtrInput: string,
): Promise<TrackAlbumLinkAudit | null> {
  const rvtr = rvtrInput.trim().toUpperCase();
  const track = await loadTrackForRecovery(rvtr);
  if (!track) return null;

  const display = await inspectQuery<{
    chart_weeks: number;
    peak_hot100_position: number | null;
    graph_track_id: number | null;
    first_chart_date: string | null;
  }>(
    `
    SELECT chart_weeks, peak_hot100_position, graph_track_id, first_chart_date::text AS first_chart_date
    FROM canonical_track_display
    WHERE upper(trim(track_id)) = upper(trim($1))
    LIMIT 1
    `,
    [rvtr],
  );
  const d = display[0];
  const firstChartYear = yearFromDate(d?.first_chart_date ?? track.first_chart_date);
  const existingLinkCount = await countExistingAlbumLinks(rvtr);
  const rawCandidates = await fetchAlbumLinkCandidates(track);
  const candidates = rankCandidates(
    {
      rvtr,
      title: track.canonical_title?.trim() ?? "",
      artistName: track.canonical_artist_name?.trim() ?? "",
      firstChartYear,
      chartWeeks: d?.chart_weeks ?? 0,
    },
    rawCandidates,
  ).slice(0, 8);

  let gap: AlbumLinkGapKind = "none";
  if (existingLinkCount === 0) gap = "missing_album_links";
  if (d?.graph_track_id == null && existingLinkCount === 0) gap = "orphan_graph_track";

  return {
    rvtr,
    title: track.canonical_title?.trim() ?? "Unknown title",
    artistName: track.canonical_artist_name?.trim() ?? "Unknown artist",
    artistId: track.artist_id,
    firstChartYear,
    chartWeeks: d?.chart_weeks ?? 0,
    peakHot100: d?.peak_hot100_position ?? null,
    trackFamilyId: track.track_family_id,
    existingLinkCount,
    gap,
    candidates,
    diagnosis: buildDiagnosis(rvtr, existingLinkCount, candidates, firstChartYear),
  };
}
