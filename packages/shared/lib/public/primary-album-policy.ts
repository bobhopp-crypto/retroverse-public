export type PrimaryAlbumPolicyReason =
  | "original-studio-album"
  | "original-release"
  | "canonical-album"
  | "compilation"
  | "greatest-hits"
  | "live"
  | "everything-else";

export type PrimaryAlbumConfidence = "high" | "medium" | "low";

export type PrimaryAlbumCandidate = {
  albumId: number;
  artistId: number;
  title: string;
  releaseYear: number | null;
  rval: string | null;
  coverUrl: string | null;
  relationshipType: string | null;
  relationshipConfidence: number | null;
  canonicalSource: string | null;
  membershipConfidence: number | null;
  reviewFlag: string | null;
  position: number | null;
  firstBillboard200Date?: string | null;
};

export type RankedPrimaryAlbum = PrimaryAlbumCandidate & {
  policyReason: PrimaryAlbumPolicyReason;
  reason: string;
  confidence: PrimaryAlbumConfidence;
};

export type PrimaryAlbumResolution = {
  primaryAlbum: RankedPrimaryAlbum | null;
  secondaryAlbums: RankedPrimaryAlbum[];
  historicalAlbum: RankedPrimaryAlbum | null;
  artworkAlbum: RankedPrimaryAlbum | null;
  albumAppearances: RankedPrimaryAlbum[];
  reason: string;
  confidence: PrimaryAlbumConfidence;
};

const RE_GREATEST_HITS =
  /\b(greatest hits?|best of|very best|essentials?|anthology|gold|platinum collection|ultimate hits?)\b/i;
const RE_COMPILATION =
  /\b(compilation|collection|collected|singles|soundtrack|box(?:ed)? set|retrospective)\b/i;
const RE_LIVE = /\b(live|in concert|unplugged|at the (?:apollo|bbc|fillmore|roxy))\b/i;
const RE_REISSUE = /\b(deluxe|expanded|anniversary|remaster(?:ed)?|reissue|bonus tracks?)\b/i;
const RE_ORIGINAL_RELATION = /\b(original|studio|primary|first[_ -]?release|album[_ -]?version)\b/i;
const RE_REJECTED = /\b(rejected|invalid|blocked|do_not_use)\b/i;

function validRval(value: string | null): boolean {
  return /^RVAL\d{6}$/i.test(value?.trim() ?? "");
}

function numericConfidence(value: number | null): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

function yearDistance(candidate: PrimaryAlbumCandidate, canonicalYear: number | null): number {
  if (candidate.releaseYear == null || canonicalYear == null) return 999;
  return Math.abs(candidate.releaseYear - canonicalYear);
}

function policyReason(
  candidate: PrimaryAlbumCandidate,
  canonicalArtistId: number,
  canonicalYear: number | null,
): PrimaryAlbumPolicyReason {
  const sameArtist = candidate.artistId === canonicalArtistId;
  const title = candidate.title.trim();
  const greatestHits = RE_GREATEST_HITS.test(title);
  const compilation = RE_COMPILATION.test(title);
  const live = RE_LIVE.test(title);
  const reissue = RE_REISSUE.test(title);
  const relation = candidate.relationshipType ?? "";
  const nearOriginalYear = yearDistance(candidate, canonicalYear) <= 1;

  if (
    sameArtist &&
    !greatestHits &&
    !compilation &&
    !live &&
    !reissue &&
    (nearOriginalYear || RE_ORIGINAL_RELATION.test(relation))
  ) {
    return "original-studio-album";
  }
  if (sameArtist && !greatestHits && !compilation && !live && !reissue) {
    return "original-release";
  }
  if (compilation) return "compilation";
  if (greatestHits) return "greatest-hits";
  if (live) return "live";
  if (validRval(candidate.rval) && (candidate.canonicalSource || candidate.reviewFlag)) {
    return "canonical-album";
  }
  return "everything-else";
}

function hasCrossArtistCollectionEvidence(candidate: PrimaryAlbumCandidate): boolean {
  const title = candidate.title.trim();
  return RE_COMPILATION.test(title) || RE_GREATEST_HITS.test(title) || RE_LIVE.test(title);
}

const POLICY_ORDER: Record<PrimaryAlbumPolicyReason, number> = {
  "original-studio-album": 0,
  "original-release": 1,
  "canonical-album": 2,
  compilation: 3,
  "greatest-hits": 4,
  live: 5,
  "everything-else": 6,
};

function confidenceFor(
  candidate: PrimaryAlbumCandidate,
  reason: PrimaryAlbumPolicyReason,
  canonicalArtistId: number,
): PrimaryAlbumConfidence {
  const sameArtist = candidate.artistId === canonicalArtistId;
  const confidence = Math.max(
    numericConfidence(candidate.relationshipConfidence),
    numericConfidence(candidate.membershipConfidence),
  );
  const reviewed = /\b(ok|approved|curated|verified)\b/i.test(candidate.reviewFlag ?? "");

  if (
    sameArtist &&
    validRval(candidate.rval) &&
    (reason === "original-studio-album" || reason === "original-release") &&
    (reviewed || confidence >= 85)
  ) {
    return "high";
  }
  if (sameArtist && validRval(candidate.rval) && confidence >= 70) return "medium";
  if (validRval(candidate.rval) && reason === "canonical-album") return "medium";
  return "low";
}

function reasonText(
  candidate: PrimaryAlbumCandidate,
  reason: PrimaryAlbumPolicyReason,
  canonicalArtistId: number,
  canonicalYear: number | null,
): string {
  const label = reason.replaceAll("-", " ");
  const evidence: string[] = [];
  if (candidate.artistId === canonicalArtistId) evidence.push("canonical artist match");
  if (candidate.releaseYear != null && canonicalYear != null) {
    evidence.push(`release ${candidate.releaseYear}; canonical year ${canonicalYear}`);
  }
  if (candidate.relationshipType) evidence.push(`relationship ${candidate.relationshipType}`);
  if (candidate.canonicalSource) evidence.push(`source ${candidate.canonicalSource}`);
  return `${label[0]!.toUpperCase()}${label.slice(1)}${evidence.length ? ` (${evidence.join("; ")})` : ""}.`;
}

function rankCandidate(
  candidate: PrimaryAlbumCandidate,
  canonicalArtistId: number,
  canonicalYear: number | null,
): RankedPrimaryAlbum {
  const resolvedReason = policyReason(candidate, canonicalArtistId, canonicalYear);
  return {
    ...candidate,
    policyReason: resolvedReason,
    reason: reasonText(candidate, resolvedReason, canonicalArtistId, canonicalYear),
    confidence: confidenceFor(candidate, resolvedReason, canonicalArtistId),
  };
}

/**
 * One deterministic public album policy. Identity is always an existing album ID;
 * titles and labels only classify an already-linked canonical candidate.
 */
export function resolvePrimaryAlbum(input: {
  canonicalArtistId: number;
  canonicalYear: number | null;
  candidates: PrimaryAlbumCandidate[];
}): PrimaryAlbumResolution {
  const unique = new Map<number, PrimaryAlbumCandidate>();
  for (const candidate of input.candidates) {
    if (!candidate.albumId || RE_REJECTED.test(candidate.reviewFlag ?? "")) continue;
    const current = unique.get(candidate.albumId);
    if (!current) {
      unique.set(candidate.albumId, candidate);
      continue;
    }
    const currentSignal = Math.max(
      numericConfidence(current.relationshipConfidence),
      numericConfidence(current.membershipConfidence),
    );
    const nextSignal = Math.max(
      numericConfidence(candidate.relationshipConfidence),
      numericConfidence(candidate.membershipConfidence),
    );
    if (nextSignal > currentSignal) unique.set(candidate.albumId, candidate);
  }

  const ranked = [...unique.values()]
    .map((candidate) => rankCandidate(candidate, input.canonicalArtistId, input.canonicalYear))
    .sort((a, b) =>
      (a.releaseYear ?? 9999) - (b.releaseYear ?? 9999) ||
      (a.firstBillboard200Date ?? "9999-99-99").localeCompare(b.firstBillboard200Date ?? "9999-99-99") ||
      (a.position ?? 9999) - (b.position ?? 9999) ||
      (a.rval ?? "ZZZZZZZZ").localeCompare(b.rval ?? "ZZZZZZZZ") ||
      a.albumId - b.albumId,
    );

  const primaryAlbum = ranked[0] ?? null;
  const artworkAlbum = ranked.find((candidate) => Boolean(candidate.coverUrl)) ?? null;
  return {
    primaryAlbum,
    secondaryAlbums: ranked.slice(1),
    historicalAlbum: primaryAlbum,
    artworkAlbum,
    albumAppearances: ranked,
    reason: primaryAlbum?.reason ?? "No canonical album relationship exists for this track.",
    confidence: primaryAlbum?.confidence ?? "low",
  };
}
