import { normalizeTrackTitleKey } from "@/lib/track/album-link-recovery/normalize-title";

import { detectReleaseShape, isMixtapeRelease } from "@/lib/healing/mb-ingest/release-shape";
import type { PilotMbRow } from "@/lib/healing/mb-ingest/types";

export type TrackRecovery = {
  rvtr: string;
  track_title: string;
  position: number;
  mb_release_id: string;
  mb_recording_id: string | null;
  chart_weeks: number;
  is_primary: boolean;
};

export type HardenedAlbumGroup = {
  albumGroupKey: string;
  artistId: number;
  artistName: string;
  albumTitle: string;
  albumYear: number | null;
  releaseShape: string;
  proposedRval: string | null;
  primary: PilotMbRow;
  recoveries: TrackRecovery[];
  qualifyReason: string;
  signals: string[];
  curationVerdict: "approve" | "review" | "reject";
  rejectReason: string | null;
  confidenceScore: number;
};

export type RejectedCandidate = {
  row: PilotMbRow;
  reason: string;
  releaseShape: string;
};

function normAlbumKey(title: string): string {
  return normalizeTrackTitleKey(title);
}

export function albumGroupKey(artistId: number, albumTitle: string): string {
  return `${artistId}:${normAlbumKey(albumTitle)}`;
}

function confidenceScore(row: PilotMbRow): number {
  let score = row.chart_weeks;
  if (row.confidence === "high") score += 100;
  if ((row.mb.tracklist?.length ?? 0) >= 10) score += 10;
  return score;
}

function hasArtistCollision(artistName: string): boolean {
  return /,|\sx\s| x | feat| ft\.|&/i.test(artistName);
}

function needsEditionReview(row: PilotMbRow): string | null {
  const title = row.title.toLowerCase();
  const album = (row.mb.album ?? "").toLowerCase();
  if (title.includes("truth hurts") && (row.mb.trackPosition ?? 0) >= 12) {
    return "deluxe_edition_track_position";
  }
  if (title.includes("calm down")) return "remix_chart_context";
  if (title.includes("big energy") && album === "777") return "single_before_ep_project";
  return null;
}

export function classifyCuration(
  row: PilotMbRow,
  releaseShape: string,
  manualOverride = false,
): { verdict: "approve" | "review" | "reject"; rejectReason: string | null } {
  if (isMixtapeRelease(row.mb.album ?? "", manualOverride)) {
    return { verdict: "reject", rejectReason: "mixtape_release_shape" };
  }
  if (releaseShape !== "studio" && releaseShape !== "deluxe") {
    return { verdict: "reject", rejectReason: `non_studio_${releaseShape}` };
  }
  if (hasArtistCollision(row.artist_name)) {
    return { verdict: "review", rejectReason: null };
  }
  const edition = needsEditionReview(row);
  if (edition) return { verdict: "review", rejectReason: null };
  if (releaseShape === "deluxe") return { verdict: "review", rejectReason: null };
  return { verdict: "approve", rejectReason: null };
}

export function groupCandidates(
  rows: Array<{
    row: PilotMbRow;
    qualifyReason: string;
    signals: string[];
  }>,
): { groups: HardenedAlbumGroup[]; rejected: RejectedCandidate[] } {
  const rejected: RejectedCandidate[] = [];
  const byAlbum = new Map<
    string,
    Array<{
      row: PilotMbRow;
      qualifyReason: string;
      signals: string[];
      releaseShape: string;
      score: number;
      curation: ReturnType<typeof classifyCuration>;
    }>
  >();

  for (const item of rows) {
    const shape = detectReleaseShape(item.row.mb.album ?? "");
    const curation = classifyCuration(item.row, shape);
    if (curation.verdict === "reject") {
      rejected.push({
        row: item.row,
        reason: curation.rejectReason ?? "rejected",
        releaseShape: shape,
      });
      continue;
    }
    if (!item.row.artist_id) continue;
    const key = albumGroupKey(item.row.artist_id, item.row.mb.album ?? "");
    const list = byAlbum.get(key) ?? [];
    list.push({
      ...item,
      releaseShape: shape,
      score: confidenceScore(item.row),
      curation,
    });
    byAlbum.set(key, list);
  }

  const groups: HardenedAlbumGroup[] = [];

  for (const [albumGroupKeyVal, members] of byAlbum) {
    const sorted = [...members].sort((a, b) => b.score - a.score);
    const survivor = sorted[0]!;
    const verdictRank = (v: "approve" | "review" | "reject") =>
      v === "approve" ? 0 : v === "review" ? 1 : 2;
    const groupVerdict = sorted.reduce<"approve" | "review" | "reject">(
      (best, m) =>
        verdictRank(m.curation.verdict) > verdictRank(best) ? m.curation.verdict : best,
      "approve",
    );

    const recoveries: TrackRecovery[] = sorted.map((m, idx) => ({
      rvtr: m.row.rvtr.trim().toUpperCase(),
      track_title: m.row.title.trim(),
      position: m.row.mb.trackPosition!,
      mb_release_id: m.row.mb.mbReleaseId!,
      mb_recording_id: m.row.mb.mbRecordingId,
      chart_weeks: m.row.chart_weeks,
      is_primary: idx === 0,
    }));

    groups.push({
      albumGroupKey: albumGroupKeyVal,
      artistId: survivor.row.artist_id!,
      artistName: survivor.row.artist_name,
      albumTitle: survivor.row.mb.album!.trim(),
      albumYear: survivor.row.mb.releaseYear,
      releaseShape: survivor.releaseShape,
      proposedRval: null,
      primary: survivor.row,
      recoveries,
      qualifyReason: survivor.qualifyReason,
      signals: [
        ...new Set([
          ...survivor.signals,
          sorted.length > 1 ? `merged_${sorted.length}_rvtrs` : "single_rvtr",
        ]),
      ],
      curationVerdict: groupVerdict,
      rejectReason: null,
      confidenceScore: survivor.score,
    });
  }

  groups.sort((a, b) => b.confidenceScore - a.confidenceScore);
  return { groups, rejected };
}
