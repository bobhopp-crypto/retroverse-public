import { mkdir, writeFile } from "node:fs/promises";

import { backfillRunReportPath } from "@/lib/covers/backfill/paths";
import type { BackfillQueueRow, BackfillState } from "@/lib/covers/backfill/types";

export type BackfillRunReport = {
  mode: "safe";
  generatedAt: string;
  uniqueAlbumsProcessed: number;
  uniqueSuccesses: number;
  uniqueFailures: number;
  successRate: number;
  mainCursorBefore: number;
  mainCursorAfter: number;
  retryQueueSize: number;
  topFailureReasons: Array<{ reason: string; count: number }>;
  topFailurePatterns: Array<{ pattern: string; count: number; examples: string[] }>;
  currentlyCovered: number;
  coversRemaining: number;
  projectedAdditionalCovers: number;
  projectedTotalCovered: number;
  projectedCoveragePct: number;
};

export function classifyFailurePattern(row: { artist: string; album: string }): string {
  const artist = row.artist.trim();
  const album = row.album.trim();

  if (/^various artists?$/i.test(artist)) return "various_artists";
  if (album && !/[a-zA-Z0-9]/.test(album)) return "punctuation_only_title";
  if (album.length <= 2) return "short_title_le2";
  if (/\bnow\s+\d+/i.test(album)) return "now_compilation";
  if (/\b(remix|remixes|soundtrack|live at|deluxe|grammy|present\.{3}|vol\.|volume)\b/i.test(album)) {
    return "compilation_or_variant_title";
  }
  if (/^live$/i.test(artist)) return "artist_name_live";
  if (/^(jay-z|beyonce|beyoncé|2pac|a\$ap|'\w)/i.test(artist) || /[$'"]/.test(artist)) {
    return "artist_name_special_chars";
  }
  if (/\.\.\./.test(album) || album.includes("&")) return "title_punctuation_heavy";
  if (/\b\d{4}\b/.test(album) && album.length > 20) return "title_with_year_noise";
  return "standard_studio_album";
}

export function aggregateTopFailureReasons(
  state: BackfillState,
): Array<{ reason: string; count: number }> {
  const counts = new Map<string, number>();
  for (const rec of Object.values(state.albumAttempts)) {
    if (rec.last_outcome !== "failure" || !rec.failure_reason) continue;
    counts.set(rec.failure_reason, (counts.get(rec.failure_reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));
}

export function aggregateTopFailurePatterns(
  state: BackfillState,
): Array<{ pattern: string; count: number; examples: string[] }> {
  const patternCounts = new Map<string, { count: number; examples: string[] }>();
  for (const [rval, rec] of Object.entries(state.albumAttempts)) {
    if (rec.last_outcome !== "failure") continue;
    const row = {
      artist: rec.artist ?? "?",
      album: rec.album ?? "?",
    };
    const pattern = classifyFailurePattern(row);
    const entry = patternCounts.get(pattern) ?? { count: 0, examples: [] };
    entry.count += 1;
    const label = `${row.artist} — ${row.album} (${rval})`;
    if (entry.examples.length < 3) entry.examples.push(label);
    patternCounts.set(pattern, entry);
  }
  return [...patternCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([pattern, v]) => ({ pattern, count: v.count, examples: v.examples }));
}

export function buildBackfillRunReport(input: {
  state: BackfillState;
  mainCursorBefore: number;
  mainCursorAfter: number;
  currentlyCovered: number;
  coversRemaining: number;
}): BackfillRunReport {
  const { state, mainCursorBefore, mainCursorAfter, currentlyCovered, coversRemaining } = input;
  const uniqueAlbumsProcessed = state.uniqueSuccessCount + state.uniqueFailureCount;
  const successRate =
    uniqueAlbumsProcessed > 0
      ? Math.round((state.uniqueSuccessCount / uniqueAlbumsProcessed) * 1000) / 10
      : 0;

  const rate = successRate / 100;
  const projectedAdditionalCovers = Math.round(coversRemaining * rate);
  const projectedTotalCovered = currentlyCovered + projectedAdditionalCovers;
  const rvalCorpus = currentlyCovered + coversRemaining;
  const projectedCoveragePct =
    rvalCorpus > 0 ? Math.round((projectedTotalCovered / rvalCorpus) * 1000) / 10 : 0;

  return {
    mode: "safe",
    generatedAt: new Date().toISOString(),
    uniqueAlbumsProcessed,
    uniqueSuccesses: state.uniqueSuccessCount,
    uniqueFailures: state.uniqueFailureCount,
    successRate,
    mainCursorBefore,
    mainCursorAfter,
    retryQueueSize: state.retryQueue.length,
    topFailureReasons: aggregateTopFailureReasons(state),
    topFailurePatterns: aggregateTopFailurePatterns(state),
    currentlyCovered,
    coversRemaining,
    projectedAdditionalCovers,
    projectedTotalCovered,
    projectedCoveragePct,
  };
}

export async function writeBackfillRunReport(report: BackfillRunReport): Promise<void> {
  await mkdir(backfillRunReportPath().replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(backfillRunReportPath(), JSON.stringify(report, null, 2));
}

export function rowFromAttempt(
  rval: string,
  rec: BackfillState["albumAttempts"][string],
): BackfillQueueRow {
  return {
    albumId: 0,
    rval,
    artist: rec?.artist ?? "?",
    album: rec?.album ?? "?",
    releaseYear: null,
    b200Peak: null,
  };
}
