import { titlesLikelyMatch } from "@/lib/track/album-link-recovery/normalize-title";
import type {
  AlbumLinkCandidate,
  ScoredAlbumLinkCandidate,
} from "@/lib/track/album-link-recovery/types";

export type TrackScoringContext = {
  title: string;
  artistName: string;
  firstChartYear: number | null;
  chartWeeks: number;
};

export function scoreAlbumLinkCandidate(
  track: TrackScoringContext,
  candidate: AlbumLinkCandidate,
): ScoredAlbumLinkCandidate {
  const reasons: string[] = [];
  let score = 0;

  const sameArtist =
    candidate.artistName.trim().toLowerCase() ===
    track.artistName.trim().toLowerCase();

  if (sameArtist) {
    score += 40;
    reasons.push("same_canonical_artist");
  } else {
    score -= 20;
    reasons.push("different_artist_compilation_or_cover");
  }

  const slotTitle = candidate.sequenceTitle ?? candidate.albumTitle;
  const exactTitle = titlesLikelyMatch(track.title, slotTitle);
  if (exactTitle) {
    score += candidate.sequenceTitle ? 35 : 10;
    reasons.push(
      candidate.sequenceTitle
        ? "album_tracklist_title_matches"
        : "album_title_related",
    );
  }

  if (
    candidate.sourceKind === "tracklist_title_unlinked" &&
    !candidate.existingRvtrOnSlot
  ) {
    score += 25;
    reasons.push("tracklist_slot_missing_rvtr_backfill_candidate");
  }

  if (candidate.sourceKind === "track_family_link") {
    score += 20;
    reasons.push("canonical_track_album_link_bridge");
  }

  if (track.firstChartYear != null && candidate.releaseYear != null) {
    const delta = Math.abs(track.firstChartYear - candidate.releaseYear);
    const yearPts = Math.max(0, 20 - delta * 2);
    score += yearPts;
    reasons.push(`release_year_delta_${delta}`);
  } else if (candidate.releaseYear == null) {
    reasons.push("album_release_year_unknown");
  }

  if (candidate.hasCanonicalCover) {
    score += 10;
    reasons.push("album_has_canonical_cover");
  }
  if (candidate.artworkLinkCount > 0) {
    score += 5;
    reasons.push("album_has_artwork_links");
  }

  if (track.chartWeeks >= 20) {
    score += 5;
    reasons.push("track_high_chart_presence");
  }

  const confidence = Math.max(0, Math.min(1, score / 100));

  return {
    ...candidate,
    score,
    confidence: Math.round(confidence * 1000) / 1000,
    reasons,
  };
}

export function rankCandidates(
  track: TrackScoringContext,
  candidates: AlbumLinkCandidate[],
): ScoredAlbumLinkCandidate[] {
  const scored = candidates.map((c) => scoreAlbumLinkCandidate(track, c));
  scored.sort(
    (a, b) =>
      b.confidence - a.confidence ||
      b.score - a.score ||
      (a.releaseYear ?? 9999) - (b.releaseYear ?? 9999),
  );
  return scored;
}
