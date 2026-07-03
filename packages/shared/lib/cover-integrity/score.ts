import type { ConfidenceBand, ScoredCoverRow } from "@/lib/cover-integrity/types";
import { detectNormalizationDrift, titlesPartiallyMatch } from "@/lib/cover-integrity/normalize";

export function scoreCoverRow(input: {
  row: Omit<
    ScoredCoverRow,
    | "confidenceScore"
    | "confidenceBand"
    | "suspicionReasons"
    | "duplicateHashCount"
    | "normalizationDrift"
    | "titleExactMatch"
    | "titlePartialMatch"
    | "artistExactMatch"
  >;
  duplicateHashCount: number;
  sameArtistHashConflict: boolean;
}): Pick<
  ScoredCoverRow,
  | "confidenceScore"
  | "confidenceBand"
  | "suspicionReasons"
  | "duplicateHashCount"
  | "normalizationDrift"
  | "titleExactMatch"
  | "titlePartialMatch"
  | "artistExactMatch"
> {
  const reasons: string[] = [];
  let score = 100;
  const hasAssignment =
    !!input.row.canonicalPath?.trim() && input.row.fileExists;

  const titleExact =
    !!input.row.titleKeyFilename &&
    input.row.titleKeyAlbum === input.row.titleKeyFilename;
  const titlePartial =
    !titleExact &&
    !!input.row.filenameAlbumSlug &&
    titlesPartiallyMatch(input.row.album, input.row.filenameAlbumSlug.replace(/-/g, " "));

  const artistExact =
    !!input.row.artistKeyFilename &&
    input.row.artistKey === input.row.artistKeyFilename;

  const normDrift = detectNormalizationDrift(
    input.row.album,
    input.row.filenameAlbumSlug,
  );

  const pathRval = input.row.canonicalPath?.match(/RVAL\d{6}/i)?.[0]?.toUpperCase();
  if (pathRval && pathRval !== input.row.rval) {
    score -= 30;
    reasons.push("rval_path_mismatch");
  }
  if (!input.row.canonicalPath) {
    score = 0;
    reasons.push("missing_canonical_path");
  } else if (!input.row.fileExists) {
    score -= 40;
    reasons.push("file_missing_on_disk");
  }
  if (hasAssignment) {
    if (!input.row.coverFilename) {
      score -= 20;
      reasons.push("unparseable_cover_filename");
    }
    if (!titleExact) {
      score -= titlePartial ? 12 : 28;
      if (!titlePartial) reasons.push("album_title_filename_mismatch");
      else reasons.push("album_title_partial_match_only");
    }
    if (!artistExact && input.row.filenameArtistSlug) {
      score -= 15;
      reasons.push("artist_slug_mismatch");
    }
    if (normDrift) {
      score -= 10;
      reasons.push("normalization_drift");
    }
    if (input.duplicateHashCount > 1) {
      const penalty = Math.min(40, (input.duplicateHashCount - 1) * 4);
      score -= penalty;
      reasons.push(`image_hash_reused_${input.duplicateHashCount}_albums`);
    }
    if (input.duplicateHashCount >= 5) {
      score -= 15;
      reasons.push("high_frequency_duplicate_cover");
    }
    if (input.sameArtistHashConflict) {
      score -= 45;
      reasons.push("same_artist_different_album_shared_image");
    }
  }
  if (input.row.linkConfidence != null && input.row.linkConfidence < 50) {
    score -= 8;
    reasons.push("low_artwork_link_confidence");
  }
  const flag = (input.row.reviewFlag || "").toLowerCase();
  if (flag === "review" || flag === "pending" || flag === "reject") {
    score -= 12;
    reasons.push(`review_flag_${flag}`);
  }
  if (flag === "curated" || flag === "ok") {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));

  let band: ConfidenceBand;
  if (!input.row.canonicalPath?.trim()) {
    band = "LOW";
  } else if (hasAssignment && input.sameArtistHashConflict) {
    band = "VERY_SUSPICIOUS";
  } else if (
    hasAssignment &&
    (!titleExact && !titlePartial && input.row.coverFilename)
  ) {
    band = "VERY_SUSPICIOUS";
  } else if (hasAssignment && score >= 82 && titleExact && artistExact) {
    band = "HIGH";
  } else if (hasAssignment && score >= 58) {
    band = "MEDIUM";
  } else if (hasAssignment) {
    band = "LOW";
  } else {
    band = "LOW";
  }

  return {
    confidenceScore: score,
    confidenceBand: band,
    suspicionReasons: reasons,
    duplicateHashCount: input.duplicateHashCount,
    normalizationDrift: normDrift,
    titleExactMatch: titleExact,
    titlePartialMatch: titlePartial,
    artistExactMatch: artistExact,
  };
}

export function defaultCoverFsRoot(): string {
  const fromEnv = process.env.RETROVERSE_COVER_FS_ROOT?.trim();
  if (fromEnv) return fromEnv;
  return "/Users/bobhopp/RETROVERSE_v2/apps/retroverse-welcome/public";
}

export function resolveCoverFilePath(
  fsRoot: string,
  canonicalPath: string | null,
): string | null {
  if (!canonicalPath?.trim()) return null;
  let rel = canonicalPath.trim().replace(/^\/+/, "");
  if (rel.startsWith("public/")) rel = rel.slice("public/".length);
  return `${fsRoot.replace(/\/+$/, "")}/${rel}`;
}
