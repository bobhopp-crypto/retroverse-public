import "server-only";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadPackageStatusByRvtr } from "@/lib/ops/browser-plus/browser-plus-artist-match";
import { loadUnmatchedVideoTracks } from "@/lib/ops/browser-plus/load-unmatched-video-tracks";
import {
  classifyAgentBucket,
  type MatchAgentReport,
  type MatchAgentResultRow,
} from "@/lib/ops/browser-plus/match-agent-types";
import { resolveQueueBatch } from "@/lib/ops/browser-plus/match-queue";
import { assignVdjLabelsBatch } from "@/lib/ops/browser-plus/vdj-label-write";
import { normVdjPath, vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";

const SCORE_BATCH = 30;

export type RunMatchAgentOptions = {
  dryRun?: boolean;
  limit?: number;
  onProgress?: (message: string) => void;
};

function toResultRow(
  item: Awaited<ReturnType<typeof resolveQueueBatch>>[number],
): MatchAgentResultRow {
  const bucket = classifyAgentBucket(item.top, item.matchTier);
  return {
    rowId: item.rowId,
    filePath: item.filePath,
    artist: item.artist,
    title: item.title,
    bucket,
    matchTier: item.matchTier,
    combinedScore: item.combinedScore,
    artistScore: item.top?.artistScore ?? 0,
    titleScore: item.top?.titleScore ?? 0,
    rvtr: item.top?.rvtr ?? null,
    matchedTitle: item.top?.title ?? null,
    matchedArtist: item.top?.artistName ?? null,
    assigned: false,
    assignError: null,
    assignLabel: null,
  };
}

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function rowsToCsv(rows: MatchAgentResultRow[]): string {
  const header = [
    "bucket",
    "artist",
    "title",
    "filePath",
    "rvtr",
    "matchedTitle",
    "matchedArtist",
    "score",
    "artistScore",
    "titleScore",
    "tier",
    "assigned",
    "assignError",
  ].join(",");
  const lines = rows.map((row) =>
    [
      row.bucket,
      row.artist,
      row.title,
      row.filePath,
      row.rvtr,
      row.matchedTitle,
      row.matchedArtist,
      row.combinedScore,
      row.artistScore,
      row.titleScore,
      row.matchTier,
      row.assigned ? "yes" : "no",
      row.assignError,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

function formatReportMarkdown(report: MatchAgentReport): string {
  const { totals, dryRun, runAt, backupPath } = report;
  return `# Match Agent Phase 2 Report

**Run:** ${runAt}  
**Mode:** ${dryRun ? "DRY RUN (no label writes)" : "LIVE (auto-assigned high confidence)"}  
**Database:** ${report.databasePath}  
**Backup:** ${backupPath ?? "—"}

---

## Summary

| Metric | Count |
|--------|------:|
| Unmatched VIDEO tracks scanned | ${totals.unmatched} |
| **Auto-Matched** (high confidence) | ${totals.autoMatched} |
| **Needs Review** | ${totals.needsReview} |
| **No Candidate** | ${totals.noCandidate} |
| Labels written | ${totals.assigned} |
| Assign failed | ${totals.assignFailed} |
| Assign skipped (blocked label) | ${totals.assignSkipped} |

---

## Auto-match rules

- Tier **A** — exact normalized artist + title
- OR combined confidence **≥ 95**

No manual confirmation for auto-matched rows.

---

## Outputs

- \`auto-matched.csv\`
- \`needs-review.csv\`
- \`no-candidate.csv\`
- \`results.json\`
`;
}

export async function runMatchAgentPhase2(
  options: RunMatchAgentOptions = {},
): Promise<MatchAgentReport> {
  const dryRun = options.dryRun === true;
  const log = options.onProgress ?? (() => {});

  log("Loading unmatched VIDEO-folder tracks…");
  let unmatched = await loadUnmatchedVideoTracks();
  if (options.limit != null && options.limit > 0) {
    unmatched = unmatched.slice(0, options.limit);
  }
  log(`Found ${unmatched.length} unmatched VIDEO tracks`);

  const packageStatusByRvtr = await loadPackageStatusByRvtr();
  const allRows: MatchAgentResultRow[] = [];

  for (let offset = 0; offset < unmatched.length; offset += SCORE_BATCH) {
    const chunk = unmatched.slice(offset, offset + SCORE_BATCH);
    log(`Scoring ${offset + chunk.length}/${unmatched.length}…`);
    const scored = await resolveQueueBatch(
      chunk.map((row) => ({
        rowId: row.rowId,
        filePath: row.filePath,
        artist: row.artist,
        title: row.title,
      })),
      packageStatusByRvtr,
    );
    allRows.push(...scored.map(toResultRow));
  }

  const autoMatched = allRows.filter((row) => row.bucket === "auto-matched");
  const needsReview = allRows.filter((row) => row.bucket === "needs-review");
  const noCandidate = allRows.filter((row) => row.bucket === "no-candidate");

  let backupPath: string | null = null;
  let assigned = 0;
  let assignFailed = 0;
  let assignSkipped = 0;

  if (!dryRun && autoMatched.length > 0) {
    log(`Auto-assigning ${autoMatched.length} high-confidence matches…`);
    const batch = await assignVdjLabelsBatch(
      autoMatched
        .filter((row) => row.rvtr)
        .map((row) => ({ filePath: row.filePath, rvtr: row.rvtr! })),
      { backupTag: "match-agent-phase-2" },
    );
    backupPath = batch.backupPath;
    assigned = batch.ok + batch.unchanged;
    assignSkipped = batch.skipped;
    assignFailed = batch.failed.length;

    const failedByPath = new Map(batch.failed.map((f) => [normVdjPath(f.filePath), f.message]));
    const successPaths = new Set(batch.succeededPaths);
    for (const row of autoMatched) {
      const norm = normVdjPath(row.filePath);
      const failMsg = failedByPath.get(norm);
      if (failMsg) {
        row.assigned = false;
        row.assignError = failMsg;
      } else if (row.rvtr && successPaths.has(norm)) {
        row.assigned = true;
      }
    }
  } else if (dryRun) {
    log(`Dry run — would auto-assign ${autoMatched.length} tracks`);
  }

  const report: MatchAgentReport = {
    runAt: new Date().toISOString(),
    dryRun,
    databasePath: vdjDatabasePath(),
    backupPath,
    totals: {
      unmatched: unmatched.length,
      autoMatched: autoMatched.length,
      needsReview: needsReview.length,
      noCandidate: noCandidate.length,
      assigned,
      assignFailed,
      assignSkipped,
    },
    autoMatched,
    needsReview,
    noCandidate,
  };

  return report;
}

export async function writeMatchAgentReport(
  report: MatchAgentReport,
  outDir: string,
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeFile(join(outDir, "REPORT.md"), formatReportMarkdown(report), "utf8"),
    writeFile(join(outDir, "results.json"), JSON.stringify(report, null, 2), "utf8"),
    writeFile(join(outDir, "auto-matched.csv"), rowsToCsv(report.autoMatched), "utf8"),
    writeFile(join(outDir, "needs-review.csv"), rowsToCsv(report.needsReview), "utf8"),
    writeFile(join(outDir, "no-candidate.csv"), rowsToCsv(report.noCandidate), "utf8"),
  ]);
}
