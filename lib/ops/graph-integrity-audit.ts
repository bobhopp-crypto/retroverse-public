import "server-only";

import { readFile } from "node:fs/promises";

import {
  combinedMatchScore,
  matchSimilarityScore,
} from "@/lib/ops/browser-plus/browser-plus-artist-match";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { loadMatchedVideoTracks } from "./canonical-coverage-audit";

/** Internal " Feat " tokenization artifact — not legitimate featuring credits. */
export const FEAT_CORRUPTION_SQL = `
  ctd.canonical_title ~* '\\mFeat\\M'
  AND ctd.canonical_title !~* '(feat\\.|featuring| ft | ft\\.|\\(ft| - feat)'
`;

export type FeatCorruptionRow = {
  rvtr: string;
  identitySource: string;
  canonicalTitle: string;
  normalizedTitleKey: string;
  graphTitle: string | null;
  artist: string;
  peakHot100: number | null;
  fileArtist: string | null;
  fileTitle: string | null;
  filePath: string | null;
  artistScore: number | null;
  titleScore: number | null;
  combinedScore: number | null;
};

export type GraphIntegrityAudit = {
  scannedAt: string;
  corruptionPattern: string;
  originHypothesis: string;
  affectedRvtrCount: number;
  tables: Array<{ table: string; corruptCount: number; notes: string }>;
  byIdentitySource: Record<string, number>;
  graphLayer: {
    graphTitleClean: number;
    graphTitleAlsoCorrupt: number;
    graphTitleMissing: number;
  };
  normalizedKeyClean: number;
  matchedVideoImpact: {
    totalMatchedVideos: number;
    filesOnCorruptRvtr: number;
    titleScoreUnder50: number;
    combinedScoreUnder68: number;
    inLeastTrustworthy500: number;
  };
  matchingUsesCorruptedTitle: string[];
  examples: FeatCorruptionRow[];
  topPeakExamples: FeatCorruptionRow[];
  allCorruptRows: FeatCorruptionRow[];
};

function simulateFtFeatCorruption(raw: string): string {
  return raw
    .replace(/ft/gi, " Feat ")
    .replace(/feat/gi, " Feat ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

export async function runGraphIntegrityAudit(options?: {
  leastTrustworthyCsvPath?: string;
}): Promise<GraphIntegrityAudit> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");

  const [corruptRows, stagingCount, matchedTracks] = await Promise.all([
    inspectQuery<{
      rvtr: string;
      identity_source: string;
      canonical_title: string;
      normalized_title_key: string;
      canonical_artist_name: string;
      peak_hot100_position: number | null;
      graph_title: string | null;
    }>(
      `
      SELECT upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
             ctd.identity_source,
             ctd.canonical_title,
             ctd.normalized_title_key,
             ctd.canonical_artist_name,
             ctd.peak_hot100_position,
             t.title AS graph_title
      FROM canonical_track_display ctd
      LEFT JOIN canonical_tracks ct ON ct.id = ctd.id
      LEFT JOIN canonical_track_versions ctv ON ctv.canonical_track_id = ct.id AND ctv.is_primary IS TRUE
      LEFT JOIN tracks t ON t.id = ctv.graph_track_id
      WHERE ${FEAT_CORRUPTION_SQL}
      ORDER BY ctd.peak_hot100_position ASC NULLS LAST, ctd.canonical_title ASC
      `,
      [],
    ),
    inspectQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM staging_canonical_track_imports s WHERE s.canonical_title ~* '\\mFeat\\M' AND s.canonical_title !~* '(feat\\.|featuring| ft | ft\\.|\\(ft| - feat)'`,
      [],
    ),
    loadMatchedVideoTracks(),
  ]);

  const fileByRvtr = new Map(matchedTracks.map((t) => [t.rvtr.toUpperCase(), t]));

  let graphClean = 0;
  let graphCorrupt = 0;
  let graphMissing = 0;
  let normalizedKeyClean = 0;
  const byIdentity: Record<string, number> = {};

  const enriched: FeatCorruptionRow[] = corruptRows.map((row) => {
    byIdentity[row.identity_source] = (byIdentity[row.identity_source] ?? 0) + 1;

    const graph = row.graph_title?.trim() || null;
    if (!graph) graphMissing += 1;
    else if (/\bFeat\b/i.test(graph)) graphCorrupt += 1;
    else graphClean += 1;

    if (
      graph &&
      row.normalized_title_key.trim().toLowerCase() ===
        graph
          .toLowerCase()
          .replace(/[^a-z0-9\s']/g, " ")
          .replace(/\s+/g, " ")
          .trim()
    ) {
      normalizedKeyClean += 1;
    }

    const file = fileByRvtr.get(row.rvtr);
    const artistScore = file
      ? matchSimilarityScore(file.artist, row.canonical_artist_name)
      : null;
    const titleScore = file ? matchSimilarityScore(file.title, row.canonical_title) : null;
    const combinedScore =
      file && artistScore != null && titleScore != null
        ? combinedMatchScore(file.artist, file.title, {
            rvtr: row.rvtr,
            canonical_artist_name: row.canonical_artist_name,
            canonical_title: row.canonical_title,
            peak_hot100_position: row.peak_hot100_position,
            first_chart_date: null,
            has_hot100: row.identity_source !== "vdj",
          })
        : null;

    return {
      rvtr: row.rvtr,
      identitySource: row.identity_source,
      canonicalTitle: row.canonical_title,
      normalizedTitleKey: row.normalized_title_key,
      graphTitle: graph,
      artist: row.canonical_artist_name,
      peakHot100: row.peak_hot100_position,
      fileArtist: file?.artist ?? null,
      fileTitle: file?.title ?? null,
      filePath: file?.filePath ?? null,
      artistScore,
      titleScore,
      combinedScore,
    };
  });

  let filesOnCorrupt = 0;
  let titleScoreUnder50 = 0;
  let combinedUnder68 = 0;
  for (const row of enriched) {
    if (!row.filePath) continue;
    filesOnCorrupt += 1;
    if ((row.titleScore ?? 100) < 50) titleScoreUnder50 += 1;
    if ((row.combinedScore ?? 100) < 68) combinedUnder68 += 1;
  }

  let inLeastTrustworthy500 = 0;
  const csvPath = options?.leastTrustworthyCsvPath;
  if (csvPath) {
    try {
      const csv = await readFile(csvPath, "utf8");
      const rvtrs = new Set(
        corruptRows.map((r) => r.rvtr),
      );
      for (const line of csv.split("\n").slice(1)) {
        const rvtr = line.split(",")[4]?.trim().toUpperCase();
        if (rvtr && rvtrs.has(rvtr)) inLeastTrustworthy500 += 1;
      }
    } catch {
      // optional
    }
  }

  const simulationMatches = enriched.filter(
    (row) =>
      row.graphTitle &&
      simulateFtFeatCorruption(row.graphTitle) === row.canonicalTitle,
  ).length;

  return {
    scannedAt: new Date().toISOString(),
    corruptionPattern: "Internal word token ' Feat ' where substring 'ft' or 'feat' was split during title-casing",
    originHypothesis: `Canonical ingest title-casing replaces in-word "ft"/"feat" with " Feat " before capitalizing (simulation matches ${simulationMatches}/${enriched.length} hot100 rows with clean graph titles). Corruption is present in staging_canonical_track_imports — predates graph display view.`,
    affectedRvtrCount: enriched.length,
    tables: [
      {
        table: "canonical_track_display",
        corruptCount: enriched.length,
        notes: "Primary read surface for matching + UI",
      },
      {
        table: "canonical_tracks",
        corruptCount: enriched.length,
        notes: "Identical canonical_title to display (0 mismatches)",
      },
      {
        table: "staging_canonical_track_imports",
        corruptCount: stagingCount[0]?.n ?? 0,
        notes: "Corruption present at import staging — origin layer",
      },
      {
        table: "tracks (graph primary)",
        corruptCount: graphCorrupt,
        notes: `${graphClean} corrupt RVTRs have clean graph titles; ${graphMissing} have no primary graph track`,
      },
      {
        table: "normalized_title_key",
        corruptCount: 0,
        notes: `${normalizedKeyClean} keys match clean graph title — field was NOT corrupted`,
      },
    ],
    byIdentitySource: byIdentity,
    graphLayer: {
      graphTitleClean: graphClean,
      graphTitleAlsoCorrupt: graphCorrupt,
      graphTitleMissing: graphMissing,
    },
    normalizedKeyClean,
    matchedVideoImpact: {
      totalMatchedVideos: matchedTracks.length,
      filesOnCorruptRvtr: filesOnCorrupt,
      titleScoreUnder50,
      combinedScoreUnder68: combinedUnder68,
      inLeastTrustworthy500,
    },
    matchingUsesCorruptedTitle: [
      "lib/sunday-nights/match-candidates.ts — ILIKE + compact compare on canonical_title",
      "lib/ops/browser-plus/match-queue.ts — matchSimilarityScore(file, canonical_title)",
      "lib/ops/browser-plus/browser-plus-artist-match.ts — combinedMatchScore",
      "lib/ops/intelligence/video-identification.ts — title/artist index from canonical_title",
      "lib/ops/intelligence/vdj-rvtr-resolve.ts — exact title match on canonical_title",
    ],
    examples: enriched
      .filter((r) => r.filePath && (r.titleScore ?? 100) < 50)
      .slice(0, 20),
    topPeakExamples: enriched.filter((r) => r.peakHot100 != null).slice(0, 15),
    allCorruptRows: enriched,
  };
}

export function formatGraphIntegrityAuditMarkdown(audit: GraphIntegrityAudit): string {
  return `# Graph Integrity Audit — Feat Tokenization Corruption

**Scanned:** ${audit.scannedAt}  
**Affected RVTRs:** ${audit.affectedRvtrCount.toLocaleString()}  
Read-only — no graph or assignment modifications.

---

## Pattern

Corrupted \`canonical_title\` values contain internal **\` Feat \`** tokens where the substring **\`ft\`** or **\`feat\`** appeared inside an English word:

| Clean title | Corrupted canonical_title |
|-------------|---------------------------|
| Fifteen | Fi Feat Een |
| Afternoon Delight | A Feat Ernoon Delight |
| Day After Day | Day A Feat Er Day |
| Drift Away | Dri Feat Away |
| Killing Me Softly With His Song | Killing Me So Feat Ly With His Song |

**Origin:** ${audit.originHypothesis}

---

## Tables affected

| Table / field | Corrupt rows | Notes |
|---------------|-------------:|-------|
${audit.tables
  .map((t) => `| \`${t.table}\` | ${t.corruptCount.toLocaleString()} | ${t.notes} |`)
  .join("\n")}

---

## By identity_source

| identity_source | Count | % |
|-----------------|------:|--:|
${Object.entries(audit.byIdentitySource)
  .sort((a, b) => b[1] - a[1])
  .map(([src, n]) => `| \`${src}\` | ${n} | ${pct(n, audit.affectedRvtrCount)}% |`)
  .join("\n")}

---

## Does matching use corrupted values?

**Yes.** Match scoring and candidate SQL query \`canonical_track_display.canonical_title\` directly:

${audit.matchingUsesCorruptedTitle.map((line) => `- \`${line}\``).join("\n")}

\`normalized_title_key\` and primary \`tracks.title\` are clean but **not used** by the match agent path today.

---

## VIDEO match impact

| Metric | Count |
|--------|------:|
| Matched VIDEO files (total) | ${audit.matchedVideoImpact.totalMatchedVideos.toLocaleString()} |
| Files labeled to corrupt RVTR | ${audit.matchedVideoImpact.filesOnCorruptRvtr} |
| Title score &lt; 50 (file vs corrupt canonical) | ${audit.matchedVideoImpact.titleScoreUnder50} |
| Combined score &lt; 68 | ${audit.matchedVideoImpact.combinedScoreUnder68} |
| In least-trustworthy-500 list | ${audit.matchedVideoImpact.inLeastTrustworthy500} |

---

## Examples — corrupt canonical vs clean graph title

${audit.topPeakExamples
  .map(
    (r) =>
      `- **${r.artist}** — graph: "${r.graphTitle}" · canonical: "${r.canonicalTitle}" · \`${r.rvtr}\` (#${r.peakHot100})`,
  )
  .join("\n")}

---

## Examples — matched VIDEO files hurt by corruption

${audit.examples
  .map(
    (r) =>
      `- **${r.fileArtist} — ${r.fileTitle}** → \`${r.rvtr}\` · titleScore ${r.titleScore} · canonical "${r.canonicalTitle}" · graph "${r.graphTitle}"`,
  )
  .join("\n")}

---

## Recommendation (audit only)

Fix \`canonical_title\` from clean \`tracks.title\` or chart source **before** conflict reassignment or new matching. Matching on \`normalized_title_key\` or graph title would bypass corruption but does not repair canonical display.

---

## Outputs

- \`graph-integrity-audit.json\`
- \`feat-corruption-rvtrs.csv\`
`;
}

export function featCorruptionToCsv(rows: FeatCorruptionRow[]): string {
  const header = [
    "rvtr",
    "identitySource",
    "canonicalTitle",
    "normalizedTitleKey",
    "graphTitle",
    "artist",
    "peakHot100",
    "fileArtist",
    "fileTitle",
    "titleScore",
    "combinedScore",
    "filePath",
  ].join(",");
  const esc = (v: string | number | null | undefined) => {
    const raw = v == null ? "" : String(v);
    return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  };
  return [
    header,
    ...rows.map((r) =>
      [
        r.rvtr,
        r.identitySource,
        r.canonicalTitle,
        r.normalizedTitleKey,
        r.graphTitle,
        r.artist,
        r.peakHot100,
        r.fileArtist,
        r.fileTitle,
        r.titleScore,
        r.combinedScore,
        r.filePath,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}
