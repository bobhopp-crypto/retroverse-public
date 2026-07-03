import {
  classifyCoverArtType,
  coverArtTypeLabel,
  coverArtTypePenalty,
  type CoverArtType,
} from "@/lib/retroverse-2/cover-art-type";

export type CoverMatchContext = {
  trackTitle: string;
  trackArtist: string;
  trackYear: number | null;
  albumTitle: string;
  albumYear: number | null;
  source: string;
  isCurrentAssigned: boolean;
};

export type CoverConfidenceResult = {
  confidence: number;
  artType: CoverArtType;
  artTypeLabel: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function titleMatches(a: string, b: string): boolean {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

function yearMatches(albumYear: number | null, trackYear: number | null): boolean {
  if (albumYear == null || trackYear == null) return false;
  return Math.abs(albumYear - trackYear) <= 1;
}

function sourceKind(source: string): string {
  const s = source.trim().toLowerCase();
  if (s.includes("musicbrainz")) return "musicbrainz";
  if (s.includes("wikipedia")) return "wikipedia";
  if (s.includes("discogs")) return "discogs";
  if (s.includes("dossier") || s.includes("inventory")) return "dossier";
  if (s.includes("upload")) return "upload";
  if (s.includes("curated")) return "curated";
  return "other";
}

/**
 * Match-based confidence for cover candidates.
 * Artwork type quality can override raw confidence — greatest hits never wins over exact album.
 */
export function computeCoverConfidence(ctx: CoverMatchContext): CoverConfidenceResult {
  let score = 50;

  const albumTitleMatch = titleMatches(ctx.albumTitle, ctx.trackTitle);
  const yearOk = yearMatches(ctx.albumYear, ctx.trackYear);
  const artType = classifyCoverArtType(ctx.albumTitle, ctx.trackTitle);

  if (albumTitleMatch) score += 24;
  if (yearOk) score += 14;

  switch (sourceKind(ctx.source)) {
    case "musicbrainz":
      score += albumTitleMatch && yearOk ? 10 : 5;
      break;
    case "wikipedia":
      score += albumTitleMatch ? 6 : 3;
      break;
    case "discogs":
      score += albumTitleMatch ? 4 : 2;
      break;
    case "curated":
      score += 6;
      break;
    case "upload":
      score += 4;
      break;
    case "dossier":
      score += albumTitleMatch && yearOk ? 1 : -6;
      break;
    default:
      break;
  }

  score -= coverArtTypePenalty(ctx.albumTitle, ctx.trackTitle, albumTitleMatch);

  if (!albumTitleMatch && normalize(ctx.albumTitle)) {
    score -= 12;
  }

  if (ctx.isCurrentAssigned) {
    score = Math.min(score + 2, 72);
  }

  if (sourceKind(ctx.source) === "musicbrainz" && albumTitleMatch && yearOk && artType === "album") {
    score = Math.max(score, 90);
  }

  if (artType === "greatest_hits") {
    score = Math.min(score, 62);
  }

  const confidence = Math.max(15, Math.min(98, Math.round(score)));
  return {
    confidence,
    artType,
    artTypeLabel: coverArtTypeLabel(artType),
  };
}

export function computeCoverConfidenceScore(ctx: CoverMatchContext): number {
  return computeCoverConfidence(ctx).confidence;
}
