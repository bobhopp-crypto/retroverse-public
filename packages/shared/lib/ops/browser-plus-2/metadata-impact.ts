import "server-only";

import {
  combinedMatchScore,
  matchSimilarityScore,
} from "@/lib/ops/browser-plus/browser-plus-artist-match";
import { classifyMatchBand } from "@/lib/ops/browser-plus/match-queue";
import { inspectPing } from "@/lib/inspect/pg";
import { loadMatchCandidates } from "@/lib/sunday-nights/match-candidates";

import { summarizeMetadataImpact } from "./metadata-recovery-report";
import { isActiveVideoRow } from "./status";
import type { Bp2MetadataImpact, Bp2Row } from "./types";

async function scoreRecoveredMatch(
  artist: string,
  title: string,
): Promise<{ band: "auto" | "review" | "search"; combinedScore: number }> {
  const candidates = await loadMatchCandidates(artist, title, 12);
  if (candidates.length === 0) {
    return { band: "search", combinedScore: 0 };
  }

  const top = candidates[0]!;
  const catalog = {
    rvtr: top.rvtr,
    canonical_title: top.title,
    canonical_artist_name: top.artistName,
    peak_hot100_position: top.peakHot100,
    first_chart_date: top.chartYear ? `${top.chartYear}-01-01` : null,
    has_hot100: top.isCharted,
  };

  const artistScore = matchSimilarityScore(artist, top.artistName);
  const titleScore = matchSimilarityScore(title, top.title);
  const combined = combinedMatchScore(artist, title, catalog);
  const band = classifyMatchBand(combined, artistScore, titleScore, top.tier ?? null);

  return { band, combinedScore: combined };
}

/** Optional graph-backed scoring for metadata orphans. Never throws. */
export async function analyzeMetadataImpact(rows: Bp2Row[]): Promise<Bp2MetadataImpact> {
  const base = summarizeMetadataImpact(rows);
  const orphans = rows.filter((row) => isActiveVideoRow(row) && row.missingXmlMetadata);
  const recoverable = orphans.filter(
    (row) => row.recoveryConfidence === "high" && row.recoveredArtist && row.recoveredTitle,
  );

  if (recoverable.length === 0) {
    return base;
  }

  let pgAvailable = false;
  try {
    await inspectPing();
    pgAvailable = true;
  } catch {
    return base;
  }

  let autoMatchableAfterRecovery = 0;
  let reviewMatchableAfterRecovery = 0;

  for (const row of recoverable) {
    try {
      const scored = await scoreRecoveredMatch(row.recoveredArtist!, row.recoveredTitle!);
      if (scored.band === "auto") autoMatchableAfterRecovery += 1;
      else if (scored.band === "review") reviewMatchableAfterRecovery += 1;
    } catch {
      reviewMatchableAfterRecovery += 1;
    }
  }

  return {
    ...base,
    autoMatchableAfterRecovery,
    reviewMatchableAfterRecovery,
    graphAvailable: pgAvailable,
  };
}
