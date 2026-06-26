/**
 * Match Agent Phase 3 — conflict reassignment report (252 rows).
 * Usage: npm run ops:match-agent-phase-3-conflicts
 */
require("./finance/preload-server-only.cjs");

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type ConflictRow = {
  fileArtist?: string;
  fileTitle?: string;
  filePath?: string;
  assignedRvtr?: string;
  assignedGraphTitle?: string;
  assignedGraphArtist?: string;
  canonicalRvtr?: string;
  canonicalTitle?: string;
  canonicalArtist?: string;
  canonicalPeak?: number | null;
  canonicalSource?: string;
  tier?: string | null;
  score?: number;
  conflictKind?: string;
};

type AutoRow = {
  rvtr: string;
  artist: string;
  title: string;
  filePath: string;
  combinedScore: number;
  matchTier: string | null;
};

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function conflictKey(row: ConflictRow): string {
  return `${row.filePath ?? ""}::${row.assignedRvtr ?? ""}::${row.canonicalRvtr ?? ""}`;
}

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/match-agent-phase-3");
  await mkdir(outDir, { recursive: true });

  const auditPath = join(root, "reports/match-agent-phase-2/rvtr-identity-audit.json");
  const resultsPath = join(
    root,
    "reports/match-agent-phase-2/2026-06-24T01-28-05-401Z/results.json",
  );

  const audit = JSON.parse(await readFile(auditPath, "utf8")) as {
    conflicts: ConflictRow[];
    fileBaseExamples: ConflictRow[];
  };
  const results = JSON.parse(await readFile(resultsPath, "utf8")) as {
    autoMatched: AutoRow[];
  };

  const scoreByPath = new Map(
    results.autoMatched.map((row) => [row.filePath.toLowerCase(), row]),
  );

  const merged = new Map<string, ConflictRow & { combinedScore: number; matchTier: string | null }>();
  for (const row of [...audit.conflicts, ...audit.fileBaseExamples]) {
    const key = conflictKey(row);
    if (merged.has(key)) continue;
    const source = scoreByPath.get((row.filePath ?? "").toLowerCase());
    merged.set(key, {
      ...row,
      combinedScore: source?.combinedScore ?? row.score ?? 0,
      matchTier: source?.matchTier ?? row.tier ?? null,
    });
  }

  const rows = [...merged.values()].sort((a, b) =>
    (a.fileArtist ?? "").localeCompare(b.fileArtist ?? ""),
  );

  const header = [
    "fileArtist",
    "fileTitle",
    "filePath",
    "currentRvtr",
    "currentIdentitySource",
    "currentGraphTitle",
    "canonicalRvtr",
    "canonicalIdentitySource",
    "canonicalTitle",
    "canonicalPeak",
    "matchTier",
    "combinedScore",
    "conflictKind",
    "reassignRecommended",
  ].join(",");

  const { inspectQuery } = await import("../lib/inspect/pg");
  const rvtrs = [
    ...new Set(
      rows.flatMap((row) => [row.assignedRvtr, row.canonicalRvtr].filter(Boolean) as string[]),
    ),
  ].map((rvtr) => rvtr.toUpperCase());

  const metaRows = await inspectQuery<{ rvtr: string; identity_source: string | null }>(
    `
    SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
           identity_source
    FROM canonical_track_display
    WHERE upper(trim(coalesce(retroverse_track_id, track_id))) = ANY($1::text[])
    `,
    [rvtrs],
  );
  const meta = new Map(metaRows.map((m) => [m.rvtr, m.identity_source ?? ""]));

  const lines = rows.map((row) => {
    const currentRvtr = row.assignedRvtr?.toUpperCase() ?? "";
    const canonicalRvtr = row.canonicalRvtr?.toUpperCase() ?? "";
    return [
      row.fileArtist,
      row.fileTitle,
      row.filePath,
      currentRvtr,
      meta.get(currentRvtr) ?? "vdj",
      row.assignedGraphTitle ?? "",
      canonicalRvtr,
      row.canonicalSource ?? meta.get(canonicalRvtr) ?? "hot100",
      row.canonicalTitle ?? "",
      row.canonicalPeak ?? "",
      row.matchTier,
      row.combinedScore,
      row.conflictKind ?? (row.assignedGraphTitle?.includes("Color") ? "file_base_title" : "graph_or_exact"),
      "yes",
    ]
      .map(csvEscape)
      .join(",");
  });

  const csvPath = join(outDir, "conflict-reassignment.csv");
  await writeFile(csvPath, [header, ...lines].join("\n"), "utf8");

  console.log(`Conflict reassignment report: ${rows.length} rows`);
  console.log(`Wrote: ${csvPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
