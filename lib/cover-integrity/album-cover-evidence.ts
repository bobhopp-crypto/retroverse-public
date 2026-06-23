import {
  albumTitleKey,
  artistSlugFromName,
  basenameFromCoverPath,
  parseCoverFilename,
  rvalFromCoverPath,
  titlesPartiallyMatch,
} from "@/lib/cover-integrity/normalize";

/** Album-level cover trust — not RVTR track recovery. */
export type AlbumCoverCanonicalStatus = "canonical" | "review_needed" | "missing" | "broken";

export type AlbumCoverEvidence = {
  status: AlbumCoverCanonicalStatus;
  quarantine: boolean;
  reasons: string[];
  titleExactMatch: boolean;
  titlePartialMatch: boolean;
  artistExactMatch: boolean;
  rvalPathMatch: boolean;
  artistOnlyEvidence: boolean;
};

export type AlbumCoverEvidenceInput = {
  albumTitle: string;
  artistName: string;
  rval: string;
  assignedPath: string | null;
  coverSource: string | null;
  linkConfidence: number | null;
  reviewFlag: string | null;
  cdnHttpStatus: number | null;
  fileExistsLocally: boolean;
  sameArtistSharedHash: boolean;
};

/**
 * Safety rule: album canonical covers require strong album-title evidence.
 * Artist-only matching is never sufficient for album-level canonical status.
 */
export function assessAlbumCoverEvidence(input: AlbumCoverEvidenceInput): AlbumCoverEvidence {
  const reasons: string[] = [];
  const filename = basenameFromCoverPath(input.assignedPath);
  const parsed = filename ? parseCoverFilename(filename) : null;

  const titleExact =
    !!parsed?.albumSlug &&
    albumTitleKey(input.albumTitle) === albumTitleKey(parsed.albumSlug.replace(/-/g, " "));
  const titlePartial =
    !titleExact &&
    !!parsed?.albumSlug &&
    titlesPartiallyMatch(input.albumTitle, parsed.albumSlug.replace(/-/g, " "));
  const artistExact =
    !!parsed?.artistSlug &&
    artistSlugFromName(input.artistName) === parsed.artistSlug.toLowerCase();
  const rvalPathMatch = rvalFromCoverPath(input.assignedPath) === input.rval.toUpperCase();

  const hasPath = !!input.assignedPath?.trim();
  /** Public site delivers via CDN — local-only files are not canonical for users. */
  const cdnDeliverable = input.cdnHttpStatus === 200;
  const assetOk = cdnDeliverable;

  const flag = (input.reviewFlag ?? "").toLowerCase();
  const source = (input.coverSource ?? "").toLowerCase();

  const artistOnlyEvidence =
    !titleExact &&
    !titlePartial &&
    (source.includes("itunes") ||
      source.includes("discogs") ||
      source.includes("musicbrainz") ||
      (input.linkConfidence != null && input.linkConfidence < 70));

  if (!hasPath) {
    return {
      status: "missing",
      quarantine: true,
      reasons: ["missing_cover_assignment"],
      titleExactMatch: false,
      titlePartialMatch: false,
      artistExactMatch: false,
      rvalPathMatch: false,
      artistOnlyEvidence: false,
    };
  }

  if (input.cdnHttpStatus === 404) {
    reasons.push("cover_asset_missing_on_cdn");
  } else if (hasPath && !cdnDeliverable && input.fileExistsLocally) {
    reasons.push("local_file_only_not_on_cdn");
  }

  if (!rvalPathMatch) reasons.push("rval_path_mismatch");
  if (!titleExact && !titlePartial) reasons.push("album_title_filename_mismatch");
  else if (!titleExact && titlePartial) reasons.push("album_title_partial_match_only");
  if (!artistExact && parsed?.artistSlug) reasons.push("artist_slug_mismatch");
  if (input.sameArtistSharedHash) reasons.push("same_artist_different_album_shared_image");
  if (artistOnlyEvidence) reasons.push("artist_only_evidence_not_allowed_for_canonical");
  if (input.linkConfidence != null && input.linkConfidence < 78) {
    reasons.push("low_artwork_link_confidence");
  }
  if (flag === "review" || flag === "pending" || flag === "reject") {
    reasons.push(`review_flag_${flag}`);
  }

  const strongTitleEvidence = titleExact || (titlePartial && artistExact && rvalPathMatch);

  if (
    strongTitleEvidence &&
    artistExact &&
    rvalPathMatch &&
    assetOk &&
    !input.sameArtistSharedHash &&
    !artistOnlyEvidence &&
    (flag === "ok" || flag === "curated" || !flag)
  ) {
    return {
      status: "canonical",
      quarantine: false,
      reasons: reasons.length ? reasons : ["strong_album_title_evidence"],
      titleExactMatch: titleExact,
      titlePartialMatch: titlePartial,
      artistExactMatch: artistExact,
      rvalPathMatch,
      artistOnlyEvidence,
    };
  }

  const status: AlbumCoverCanonicalStatus =
    hasPath && !assetOk ? "broken" : "review_needed";

  return {
    status,
    quarantine: true,
    reasons,
    titleExactMatch: titleExact,
    titlePartialMatch: titlePartial,
    artistExactMatch: artistExact,
    rvalPathMatch,
    artistOnlyEvidence,
  };
}

export type QuarantineEntry = {
  artist: string;
  album: string;
  releaseYear: number | null;
  albumId: number;
  rval: string;
  status: AlbumCoverCanonicalStatus;
  reasons: string[];
  assignedPath: string | null;
  assignedUrl: string | null;
};

export function buildQuarantineList(
  rows: Array<QuarantineEntry & { quarantine: boolean }>,
): QuarantineEntry[] {
  return rows
    .filter((r) => r.quarantine)
    .map(({ quarantine: _q, ...rest }) => rest)
    .sort((a, b) => a.artist.localeCompare(b.artist) || (a.releaseYear ?? 0) - (b.releaseYear ?? 0));
}
