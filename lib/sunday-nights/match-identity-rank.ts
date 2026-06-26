/** Canonical identity preference for match candidate ranking. */

export type MatchIdentitySource = "hot100" | "hot100_vdj" | "vdj" | string | null | undefined;

const SUFFIX_WORDS =
  /\b(color|bw|extended|live|remix|edit|po edit|hq|official video|official|video|clean|dirty|radio|version|mix|instrumental|acoustic|demo|acapella|promo only|no break edit|midnight special|mtv unplugged|muppet show|glastonbury|festival)\b/gi;

const MATCH_TIER_RANK: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  manual: 6,
  "manual-fuzzy": 7,
};

/** Lower rank = higher priority. */
export function identitySourceRank(source: MatchIdentitySource): number {
  if (source === "hot100" || source === "hot100_vdj") return 1;
  if (source === "vdj") return 3;
  if (source) return 2;
  return 4;
}

export function matchTierRank(tier: string | null | undefined): number {
  if (!tier) return 99;
  return MATCH_TIER_RANK[tier] ?? 50;
}

export function cleanTitleForMatch(title: string): string {
  return title
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function baseTitleForMatch(title: string): string {
  return cleanTitleForMatch(title)
    .replace(SUFFIX_WORDS, " ")
    .replace(/[^a-z0-9\s']/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function compactTitleKey(title: string): string {
  let key = baseTitleForMatch(title).replace(/[^a-z0-9]/g, "");
  key = key.replace(/^please/, "");
  if (key.startsWith("the") && key.length > 5) {
    const withoutThe = key.slice(3);
    if (withoutThe.length >= 4) key = withoutThe;
  }
  return key;
}

export function yearFromFilePath(filePath: string | null | undefined): number | null {
  if (!filePath) return null;
  const decade = filePath.match(/[/\\](\d{4})'?s[/\\]/i);
  if (decade) return Number(decade[1]);
  const year = filePath.match(/[/\\](19\d{2}|20\d{2})[/\\]/);
  if (year) return Number(year[1]);
  return null;
}

export function yearProximityScore(
  fileYear: number | null | undefined,
  chartYear: number | null | undefined,
): number {
  if (fileYear == null || chartYear == null) return 0;
  const diff = Math.abs(fileYear - chartYear);
  if (diff === 0) return 100;
  if (diff <= 2) return 90;
  if (diff <= 5) return 75;
  if (diff <= 10) return 50;
  return Math.max(0, 40 - diff);
}

export type RankableMatchCandidate = {
  identitySource?: MatchIdentitySource;
  tier?: string | null;
  artistScore?: number | null;
  titleScore?: number | null;
  matchScore?: number | null;
  chartYear?: number | null;
};

export function compareMatchCandidates(
  a: RankableMatchCandidate,
  b: RankableMatchCandidate,
  fileYear?: number | null,
): number {
  const idDiff = identitySourceRank(a.identitySource) - identitySourceRank(b.identitySource);
  if (idDiff !== 0) return idDiff;

  const tierDiff = matchTierRank(a.tier) - matchTierRank(b.tier);
  if (tierDiff !== 0) return tierDiff;

  const artistDiff = (b.artistScore ?? 0) - (a.artistScore ?? 0);
  if (artistDiff !== 0) return artistDiff;

  const titleDiff = (b.titleScore ?? 0) - (a.titleScore ?? 0);
  if (titleDiff !== 0) return titleDiff;

  const yearDiff =
    yearProximityScore(fileYear, b.chartYear) - yearProximityScore(fileYear, a.chartYear);
  if (yearDiff !== 0) return yearDiff;

  return (b.matchScore ?? 0) - (a.matchScore ?? 0);
}
