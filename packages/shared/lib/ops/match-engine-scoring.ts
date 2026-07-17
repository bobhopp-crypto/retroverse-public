import { identitySourceRank } from "@/lib/sunday-nights/match-identity-rank";

export type ConfidenceBucket = "exact" | "high" | "medium" | "low" | "suspicious";

const VIDEO_TITLE_NOISE =
  /\b(official video|official|video|live|color|bw|remastered|remaster|hd|4k|uhd|hq|clean|dirty|radio edit|radio version|extended|remix|edit|lyric video|lyrics|tv show|muppet show|glastonbury|festival|mtv unplugged|promo only|no break edit|acapella|instrumental|demo|version|mix|visualizer|vevo|youtube|1080p|720p)\b/gi;

const YEAR_SUFFIX = /\b(19|20)\d{2}\b/g;

/** Compact artist key — lowercase, no spaces/punctuation/apostrophes. */
export function normalizeArtistKey(artist: string): string {
  return artist
    .trim()
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/[''´`]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Artist lookup keys including primary billing name before feat/&. */
export function artistLookupKeys(artist: string): string[] {
  const keys = new Set<string>();
  const primary = artist.split(/\s+(?:feat\.?|featuring|ft\.?|with)\s+|\s*[&,/]\s*/i)[0] ?? artist;
  for (const part of [artist, primary]) {
    const key = normalizeArtistKey(part);
    if (key.length >= 2) keys.add(key);
  }
  return [...keys];
}

export function artistsMatch(fileArtist: string, catalogArtist: string): boolean {
  const a = normalizeArtistKey(fileArtist);
  const b = normalizeArtistKey(catalogArtist);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

/** Compact video title — strip noise tokens, years, punctuation. */
export function normalizeVideoTitleKey(title: string): string {
  let s = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(featuring|feat\.?|ft\.?)\b/gi, " ")
    .replace(/&/g, " and ")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(VIDEO_TITLE_NOISE, " ")
    .replace(YEAR_SUFFIX, " ")
    .replace(/[\u2018\u2019\u201B\u2032'´`]/g, "")
    .toLowerCase();
  s = s.replace(/[^a-z0-9]/g, "");
  return s;
}

/** Canonical side — prefer normalized_title_key, then graph title, then display title. */
export function canonicalTitleKey(input: {
  normalizedTitleKey: string | null;
  graphTitle: string | null;
  canonicalTitle: string;
}): string {
  if (input.normalizedTitleKey?.trim()) {
    return input.normalizedTitleKey.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  if (input.graphTitle?.trim()) {
    return normalizeVideoTitleKey(input.graphTitle);
  }
  return normalizeVideoTitleKey(input.canonicalTitle);
}

/**
 * Containment score: matched characters ÷ canonical title length.
 * Full containment of canonical in video → 100.
 */
export function titleContainmentScore(canonicalKey: string, videoKey: string): number {
  if (!canonicalKey || !videoKey) return 0;
  if (canonicalKey === videoKey) return 100;
  if (videoKey.includes(canonicalKey)) return 100;

  let best = 0;
  for (let len = canonicalKey.length; len >= Math.min(6, canonicalKey.length); len -= 1) {
    for (let i = 0; i <= canonicalKey.length - len; i += 1) {
      const sub = canonicalKey.slice(i, i + len);
      if (sub.length >= 4 && videoKey.includes(sub)) {
        best = Math.max(best, len);
      }
    }
    if (best === canonicalKey.length) break;
  }
  return Math.round((best / canonicalKey.length) * 100);
}

export function isCanonicalIdentity(source: string | null | undefined): boolean {
  return source === "hot100" || source === "hot100_vdj";
}

export function classifySimulatedBucket(input: {
  artistMatched: boolean;
  containmentScore: number;
  identitySource: string | null;
  hasCandidate: boolean;
}): ConfidenceBucket {
  if (!input.hasCandidate || !input.artistMatched) return "suspicious";
  const { containmentScore: cs, identitySource } = input;
  const canonical = isCanonicalIdentity(identitySource);

  if (cs >= 100 && canonical) return "exact";
  if (cs >= 95 && canonical) return "exact";
  if (cs >= 92 && canonical) return "high";
  if (cs >= 88 && canonical) return "high";
  if (cs >= 80 && canonical) return "medium";
  if (cs >= 92 && identitySource === "vdj") return "medium";
  if (cs >= 70) return "low";
  return "suspicious";
}

export function bucketRank(bucket: ConfidenceBucket): number {
  switch (bucket) {
    case "exact":
      return 5;
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    default:
      return 1;
  }
}

export function wouldAutoAssign(bucket: ConfidenceBucket): boolean {
  return bucket === "exact" || bucket === "high";
}

export function wouldReview(bucket: ConfidenceBucket): boolean {
  return bucket === "medium";
}

export function compareCandidates(
  a: { identitySource: string | null; containmentScore: number; peakHot100: number | null },
  b: { identitySource: string | null; containmentScore: number; peakHot100: number | null },
): number {
  const idDiff = identitySourceRank(a.identitySource) - identitySourceRank(b.identitySource);
  if (idDiff !== 0) return idDiff;
  const scoreDiff = b.containmentScore - a.containmentScore;
  if (scoreDiff !== 0) return scoreDiff;
  const peakA = a.peakHot100 ?? 9999;
  const peakB = b.peakHot100 ?? 9999;
  return peakA - peakB;
}

export function simulationConfidence(input: {
  artistMatched: boolean;
  containmentScore: number;
  identitySource: string | null;
  bucket: ConfidenceBucket;
}): number {
  let score = input.containmentScore;
  if (!input.artistMatched) score = Math.min(score, 40);
  score -= (identitySourceRank(input.identitySource) - 1) * 5;
  if (input.bucket === "exact") score = Math.max(score, 98);
  if (input.bucket === "high") score = Math.max(score, 93);
  return Math.max(0, Math.min(100, Math.round(score)));
}
