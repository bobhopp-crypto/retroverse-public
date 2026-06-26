import "server-only";

import { readFile } from "node:fs/promises";

import {
  combinedMatchScore,
  matchSimilarityScore,
} from "@/lib/ops/browser-plus/browser-plus-artist-match";
import {
  baseTitleForMatch,
  compactTitleKey,
  identitySourceRank,
} from "@/lib/sunday-nights/match-identity-rank";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import {
  loadMatchedVideoTracks,
  type MatchedVideoTrack,
} from "./canonical-coverage-audit";

export type ConfidenceBucket = "exact" | "high" | "medium" | "low" | "suspicious";

export type VideoMatchConfidenceRow = {
  filePath: string;
  fileArtist: string;
  fileTitle: string;
  rvtr: string;
  graphArtist: string;
  graphTitle: string;
  identitySource: string;
  artistScore: number;
  titleScore: number;
  baseTitleScore: number;
  combinedScore: number;
  trustScore: number;
  bucket: ConfidenceBucket;
  flags: string[];
};

export type VideoMatchConfidenceAudit = {
  scannedAt: string;
  total: number;
  buckets: Record<ConfidenceBucket, number>;
  bucketPct: Record<ConfidenceBucket, number>;
  byIdentity: Record<string, Record<ConfidenceBucket, number>>;
  leastTrustworthy: VideoMatchConfidenceRow[];
  samples: Record<ConfidenceBucket, VideoMatchConfidenceRow[]>;
};

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

function compact(value: string): string {
  return value
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function detectInversion(
  fileArtist: string,
  fileTitle: string,
  graphArtist: string,
  graphTitle: string,
): string | null {
  const fa = compact(fileArtist);
  const ft = compact(fileTitle);
  const ga = compact(graphArtist);
  const gt = compact(graphTitle);
  if (
    fa.length > 4 &&
    gt.length > 4 &&
    (fa === gt || fa.includes(gt) || gt.includes(fa)) &&
    fa !== ga
  ) {
    return "artist_title_inversion";
  }
  if (
    ft.length > 4 &&
    ga.length > 4 &&
    (ft === ga || ft.includes(ga) || ga.includes(ft)) &&
    ft !== gt
  ) {
    return "title_artist_inversion";
  }
  return null;
}

function parseCsvField(line: string, index: number): string {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      cols.push(cur);
      cur = "";
    } else cur += ch;
  }
  cols.push(cur);
  return cols[index]?.trim() ?? "";
}

async function loadWrongLayerKeys(conflictCsvPath: string): Promise<{
  rvtrs: Set<string>;
  paths: Set<string>;
}> {
  const rvtrs = new Set<string>();
  const paths = new Set<string>();
  try {
    const csv = await readFile(conflictCsvPath, "utf8");
    const lines = csv.trim().split("\n").slice(1);
    for (const line of lines) {
      const path = parseCsvField(line, 2);
      const rvtr = parseCsvField(line, 3).toUpperCase();
      if (rvtr) rvtrs.add(rvtr);
      if (path) paths.add(path.toLowerCase());
    }
  } catch {
    // optional
  }
  return { rvtrs, paths };
}

export function classifyMatchConfidence(input: {
  artistScore: number;
  titleScore: number;
  baseTitleScore: number;
  combinedScore: number;
  identitySource: string | null;
  flags: string[];
}): ConfidenceBucket {
  const { artistScore, titleScore, baseTitleScore, combinedScore, identitySource, flags } = input;
  const canonical =
    identitySource === "hot100" || identitySource === "hot100_vdj";
  const wrongLayer = flags.includes("wrong_layer");
  const inverted = flags.some((f) => f.includes("inversion"));
  const missingGraph = flags.includes("missing_graph");

  if (
    inverted ||
    missingGraph ||
    artistScore < 35 ||
    titleScore < 35 ||
    combinedScore < 45
  ) {
    return "suspicious";
  }

  if (
    canonical &&
    !wrongLayer &&
    artistScore >= 95 &&
    titleScore >= 95 &&
    baseTitleScore >= 90
  ) {
    return "exact";
  }

  if (
    canonical &&
    !wrongLayer &&
    artistScore >= 80 &&
    titleScore >= 88 &&
    combinedScore >= 92
  ) {
    return "high";
  }

  if (
    (canonical && artistScore >= 65 && titleScore >= 65 && combinedScore >= 68) ||
    (!canonical &&
      artistScore >= 80 &&
      titleScore >= 88 &&
      combinedScore >= 92 &&
      !wrongLayer)
  ) {
    return "medium";
  }

  if (combinedScore >= 55 || (artistScore >= 50 && titleScore >= 50)) {
    return "low";
  }

  return "suspicious";
}

export function computeTrustScore(input: {
  combinedScore: number;
  artistScore: number;
  titleScore: number;
  identitySource: string | null;
  flags: string[];
}): number {
  let score = input.combinedScore;
  score -= (identitySourceRank(input.identitySource) - 1) * 8;
  if (input.flags.includes("wrong_layer")) score -= 22;
  if (input.flags.some((f) => f.includes("inversion"))) score -= 45;
  if (input.flags.includes("missing_graph")) score -= 50;
  if (input.artistScore < 50) score -= Math.round((50 - input.artistScore) * 0.4);
  if (input.titleScore < 50) score -= Math.round((50 - input.titleScore) * 0.4);
  return Math.max(0, Math.round(score));
}

export async function runVideoMatchConfidenceAudit(options?: {
  conflictCsvPath?: string;
  leastTrustworthyLimit?: number;
}): Promise<VideoMatchConfidenceAudit> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");

  const leastLimit = options?.leastTrustworthyLimit ?? 500;
  const conflictPath =
    options?.conflictCsvPath ??
    "reports/match-agent-phase-3/conflict-reassignment.csv";

  const [tracks, wrongLayer] = await Promise.all([
    loadMatchedVideoTracks(),
    loadWrongLayerKeys(conflictPath),
  ]);

  const rvtrs = [...new Set(tracks.map((t) => t.rvtr.toUpperCase()))];
  const metaRows = await inspectQuery<{
    rvtr: string;
    identity_source: string | null;
    canonical_artist_name: string;
    canonical_title: string;
    has_hot100: boolean;
  }>(
    `
    SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
           identity_source,
           coalesce(canonical_artist_name, '') AS canonical_artist_name,
           coalesce(canonical_title, '') AS canonical_title,
           coalesce(has_hot100, false) AS has_hot100
    FROM canonical_track_display
    WHERE upper(trim(coalesce(retroverse_track_id, track_id))) = ANY($1::text[])
    `,
    [rvtrs],
  );
  const metaByRvtr = new Map(metaRows.map((r) => [r.rvtr, r]));

  const rows: VideoMatchConfidenceRow[] = [];

  for (const track of tracks) {
    const rvtr = track.rvtr.toUpperCase();
    const meta = metaByRvtr.get(rvtr);
    const flags: string[] = [];

    if (!meta) {
      flags.push("missing_graph");
    }

    const graphArtist = meta?.canonical_artist_name ?? "";
    const graphTitle = meta?.canonical_title ?? "";
    const identitySource = meta?.identity_source ?? "missing";

    const inversion = detectInversion(track.artist, track.title, graphArtist, graphTitle);
    if (inversion) flags.push(inversion);

    if (
      wrongLayer.rvtrs.has(rvtr) ||
      wrongLayer.paths.has(track.filePath.toLowerCase())
    ) {
      flags.push("wrong_layer");
    }

    if (identitySource === "vdj" && meta?.has_hot100) {
      flags.push("vdj_with_chart_flag");
    }

    const artistScore = graphArtist
      ? matchSimilarityScore(track.artist, graphArtist)
      : 0;
    const titleScore = graphTitle ? matchSimilarityScore(track.title, graphTitle) : 0;
    const baseTitleScore = graphTitle
      ? matchSimilarityScore(baseTitleForMatch(track.title), baseTitleForMatch(graphTitle))
      : 0;

    const compactFile = compactTitleKey(track.title);
    const compactGraph = compactTitleKey(graphTitle);
    if (compactFile && compactGraph && compactFile === compactGraph && titleScore < 95) {
      flags.push("base_title_exact_surface_mismatch");
    }

    const combinedScore = meta
      ? combinedMatchScore(track.artist, track.title, {
          rvtr,
          canonical_artist_name: graphArtist,
          canonical_title: graphTitle,
          peak_hot100_position: null,
          first_chart_date: null,
          has_hot100: meta.has_hot100,
        })
      : 0;

    const trustScore = computeTrustScore({
      combinedScore,
      artistScore,
      titleScore,
      identitySource,
      flags,
    });

    const bucket = classifyMatchConfidence({
      artistScore,
      titleScore,
      baseTitleScore,
      combinedScore,
      identitySource,
      flags,
    });

    rows.push({
      filePath: track.filePath,
      fileArtist: track.artist,
      fileTitle: track.title,
      rvtr,
      graphArtist,
      graphTitle,
      identitySource,
      artistScore,
      titleScore,
      baseTitleScore,
      combinedScore,
      trustScore,
      bucket,
      flags,
    });
  }

  const buckets: Record<ConfidenceBucket, number> = {
    exact: 0,
    high: 0,
    medium: 0,
    low: 0,
    suspicious: 0,
  };
  const byIdentity: Record<string, Record<ConfidenceBucket, number>> = {};

  for (const row of rows) {
    buckets[row.bucket] += 1;
    const src = row.identitySource || "missing";
    byIdentity[src] = byIdentity[src] ?? {
      exact: 0,
      high: 0,
      medium: 0,
      low: 0,
      suspicious: 0,
    };
    byIdentity[src][row.bucket] += 1;
  }

  const bucketPct = Object.fromEntries(
    (Object.keys(buckets) as ConfidenceBucket[]).map((key) => [
      key,
      pct(buckets[key], rows.length),
    ]),
  ) as Record<ConfidenceBucket, number>;

  const sorted = [...rows].sort(
    (a, b) =>
      a.trustScore - b.trustScore ||
      a.combinedScore - b.combinedScore ||
      a.filePath.localeCompare(b.filePath),
  );

  const samples = {} as Record<ConfidenceBucket, VideoMatchConfidenceRow[]>;
  for (const key of Object.keys(buckets) as ConfidenceBucket[]) {
    samples[key] = rows.filter((r) => r.bucket === key).slice(0, 5);
  }

  return {
    scannedAt: new Date().toISOString(),
    total: rows.length,
    buckets,
    bucketPct,
    byIdentity,
    leastTrustworthy: sorted.slice(0, leastLimit),
    samples,
  };
}

export function formatVideoMatchConfidenceMarkdown(audit: VideoMatchConfidenceAudit): string {
  const b = audit.buckets;
  return `# VIDEO Match Confidence Audit

**Scanned:** ${audit.scannedAt}  
**Matched VIDEO tracks:** ${audit.total.toLocaleString()}  
Read-only — no assignments modified.

---

## Confidence buckets

| Bucket | Count | % | Criteria summary |
|--------|------:|--:|------------------|
| **Exact** | ${b.exact} | ${audit.bucketPct.exact}% | Canonical identity, artist ≥95, title ≥95, base title ≥90, no wrong-layer |
| **High** | ${b.high} | ${audit.bucketPct.high}% | Canonical identity, artist ≥80, title ≥88, combined ≥92 |
| **Medium** | ${b.medium} | ${audit.bucketPct.medium}% | Canonical ≥65/65/68 OR VDJ exact-file match without wrong-layer |
| **Low** | ${b.low} | ${audit.bucketPct.low}% | Partial match (combined ≥55 or both dimensions ≥50) |
| **Suspicious** | ${b.suspicious} | ${audit.bucketPct.suspicious}% | Inversion, missing graph, or scores below trust floor |

---

## By identity_source

| identity_source | Exact | High | Medium | Low | Suspicious |
|-----------------|------:|-----:|-------:|----:|-----------:|
${Object.entries(audit.byIdentity)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([src, counts]) =>
      `| \`${src}\` | ${counts.exact} | ${counts.high} | ${counts.medium} | ${counts.low} | ${counts.suspicious} |`,
  )
  .join("\n")}

---

## Outputs

- \`least-trustworthy-500.csv\` — lowest trustScore matches
- \`video-match-confidence-audit.json\` — full classification
`;
}

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function leastTrustworthyToCsv(rows: VideoMatchConfidenceRow[]): string {
  const header = [
    "trustScore",
    "bucket",
    "fileArtist",
    "fileTitle",
    "rvtr",
    "graphArtist",
    "graphTitle",
    "identitySource",
    "artistScore",
    "titleScore",
    "baseTitleScore",
    "combinedScore",
    "flags",
    "filePath",
  ].join(",");
  const lines = rows.map((row) =>
    [
      row.trustScore,
      row.bucket,
      row.fileArtist,
      row.fileTitle,
      row.rvtr,
      row.graphArtist,
      row.graphTitle,
      row.identitySource,
      row.artistScore,
      row.titleScore,
      row.baseTitleScore,
      row.combinedScore,
      row.flags.join("|"),
      row.filePath,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}
