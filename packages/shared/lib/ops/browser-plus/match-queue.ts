import "server-only";

import {
  combinedMatchScore,
  matchSimilarityScore,
} from "@/lib/ops/browser-plus/browser-plus-artist-match";
import type {
  BrowserPlusMatchBand,
  BrowserPlusQueueCandidate,
  BrowserPlusQueueItem,
} from "@/lib/ops/browser-plus/match-queue-types";
import {
  AUTO_MATCH_MIN_ARTIST,
  AUTO_MATCH_MIN_COMBINED,
  AUTO_MATCH_MIN_TITLE,
  REVIEW_MIN_COMBINED,
} from "@/lib/ops/browser-plus/match-queue-types";
import { compareMatchCandidates, yearFromFilePath } from "@/lib/sunday-nights/match-identity-rank";
import { loadMatchCandidates } from "@/lib/sunday-nights/match-candidates";

export function classifyMatchBand(
  combined: number,
  artistScore: number,
  titleScore: number,
  tier?: string | null,
): BrowserPlusMatchBand {
  if (
    tier === "A" ||
    (combined >= AUTO_MATCH_MIN_COMBINED &&
      artistScore >= AUTO_MATCH_MIN_ARTIST &&
      titleScore >= AUTO_MATCH_MIN_TITLE)
  ) {
    return "auto";
  }
  if (combined >= REVIEW_MIN_COMBINED) return "review";
  return "search";
}

function toCandidate(
  artist: string,
  title: string,
  row: {
    rvtr: string;
    title: string;
    artistName: string;
    chartYear: number | null;
    peakHot100: number | null;
    isCharted: boolean;
    chartSource: string | null;
    tier?: string | null;
    identitySource?: string | null;
    packageStatus?: string;
  },
  packageStatus: string,
): BrowserPlusQueueCandidate {
  const artistScore = matchSimilarityScore(artist, row.artistName);
  const titleScore = matchSimilarityScore(title, row.title);
  const combinedScore = combinedMatchScore(artist, title, {
    rvtr: row.rvtr,
    canonical_title: row.title,
    canonical_artist_name: row.artistName,
    peak_hot100_position: row.peakHot100,
    first_chart_date: row.chartYear ? `${row.chartYear}-01-01` : null,
    has_hot100: row.isCharted,
  });
  return {
    rvtr: row.rvtr,
    title: row.title,
    artistName: row.artistName,
    chartYear: row.chartYear,
    chartStatus:
      row.isCharted && row.peakHot100 != null
        ? `#${row.peakHot100}`
        : row.isCharted
          ? row.chartSource ?? "Charted"
          : "—",
    packageStatus,
    matchScore: combinedScore,
    artistScore,
    titleScore,
  };
}

export async function resolveQueueItem(input: {
  rowId: string;
  filePath: string;
  artist: string;
  title: string;
  packageStatusByRvtr: Map<string, string>;
}): Promise<BrowserPlusQueueItem> {
  const artist = input.artist.trim();
  const title = input.title.trim();

  if (!artist || !title) {
    return {
      rowId: input.rowId,
      filePath: input.filePath,
      artist,
      title,
      band: "search",
      combinedScore: 0,
      top: null,
      alternatives: [],
      matchTier: null,
    };
  }

  const candidates = await loadMatchCandidates(artist, title, 12);
  const fileYear = yearFromFilePath(input.filePath);
  const scored: BrowserPlusQueueCandidate[] = candidates.map((c) =>
    toCandidate(
      artist,
      title,
      {
        rvtr: c.rvtr,
        title: c.title,
        artistName: c.artistName,
        chartYear: c.chartYear,
        peakHot100: c.peakHot100,
        isCharted: c.isCharted,
        chartSource: c.chartSource,
        tier: c.tier,
        identitySource: c.identitySource,
      },
      input.packageStatusByRvtr.get(c.rvtr) ?? "—",
    ),
  );

  scored.sort((a, b) => {
    const candidateA = candidates.find((c) => c.rvtr === a.rvtr);
    const candidateB = candidates.find((c) => c.rvtr === b.rvtr);
    return compareMatchCandidates(
      {
        identitySource: candidateA?.identitySource,
        tier: candidateA?.tier,
        artistScore: a.artistScore,
        titleScore: a.titleScore,
        matchScore: a.matchScore,
        chartYear: a.chartYear,
      },
      {
        identitySource: candidateB?.identitySource,
        tier: candidateB?.tier,
        artistScore: b.artistScore,
        titleScore: b.titleScore,
        matchScore: b.matchScore,
        chartYear: b.chartYear,
      },
      fileYear,
    );
  });
  const top = scored[0] ?? null;
  const tier = candidates.find((c) => c.rvtr === top?.rvtr)?.tier ?? null;
  const combined = top?.matchScore ?? 0;
  const band = top
    ? classifyMatchBand(combined, top.artistScore, top.titleScore, tier)
    : "search";

  return {
    rowId: input.rowId,
    filePath: input.filePath,
    artist,
    title,
    band,
    combinedScore: combined,
    top,
    alternatives: scored.slice(0, 3),
    matchTier: tier,
  };
}

export async function resolveQueueBatch(
  rows: Array<{ rowId: string; filePath: string; artist: string; title: string }>,
  packageStatusByRvtr: Map<string, string>,
): Promise<BrowserPlusQueueItem[]> {
  const out: BrowserPlusQueueItem[] = [];
  for (const row of rows) {
    out.push(
      await resolveQueueItem({
        ...row,
        packageStatusByRvtr,
      }),
    );
  }
  return out;
}
