import "server-only";

import {
  combinedMatchScore,
  matchSimilarityScore,
} from "@/lib/ops/browser-plus/browser-plus-artist-match";
import { FEAT_CORRUPTION_SQL } from "@/lib/ops/graph-integrity-audit";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { baseTitleForMatch } from "@/lib/sunday-nights/match-identity-rank";

import type { VideoLibraryTrack } from "./load-video-library-tracks";
import { loadAllVideoLibraryTracks } from "./load-video-library-tracks";
import {
  artistLookupKeys,
  artistsMatch,
  bucketRank,
  canonicalTitleKey,
  classifySimulatedBucket,
  compareCandidates,
  type ConfidenceBucket,
  normalizeVideoTitleKey,
  simulationConfidence,
  titleContainmentScore,
  wouldAutoAssign,
  wouldReview,
  isCanonicalIdentity,
} from "./match-engine-scoring";
import {
  classifyMatchConfidence,
} from "./video-match-confidence-audit";

export type CatalogCandidate = {
  rvtr: string;
  identitySource: string;
  artist: string;
  canonicalTitle: string;
  graphTitle: string | null;
  normalizedTitleKey: string | null;
  titleKey: string;
  peakHot100: number | null;
};

export type SimulationRow = {
  filePath: string;
  fileArtist: string;
  fileTitle: string;
  currentRvtr: string | null;
  currentIdentity: string | null;
  currentBucket: ConfidenceBucket | "unresolved";
  simulatedRvtr: string | null;
  simulatedIdentity: string | null;
  simulatedBucket: ConfidenceBucket | "unresolved";
  simulatedConfidence: number;
  containmentScore: number;
  reassignment: boolean;
  bucketImproved: boolean;
  vdjToCanonical: boolean;
};

export type MatchEngineSimulationReport = {
  scannedAt: string;
  inventory: {
    totalVideoFiles: number;
    assigned: number;
    unresolved: number;
  };
  currentBuckets: Record<ConfidenceBucket | "unresolved", number>;
  simulatedBuckets: Record<ConfidenceBucket | "unresolved", number>;
  impact: {
    bucketImproved: number;
    bucketDegraded: number;
    unchanged: number;
    reassignmentOpportunities: number;
    vdjToCanonical: number;
    currentReviewItems: number;
    simulatedReviewItems: number;
    reviewDisappeared: number;
    unresolvedNowMatchable: number;
    unresolvedAutoMatch: number;
    simulatedWouldRemainUnassigned: number;
    identityCanonicalBefore: number;
    identityCanonicalAfter: number;
  };
  reassignmentSample: SimulationRow[];
  allReassignments: SimulationRow[];
  examples: {
    newlyMatched: SimulationRow[];
    vdjToCanonical: SimulationRow[];
    reviewToAuto: SimulationRow[];
  };
  allRows: SimulationRow[];
};

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

function emptyBuckets(): Record<ConfidenceBucket | "unresolved", number> {
  return { exact: 0, high: 0, medium: 0, low: 0, suspicious: 0, unresolved: 0 };
}

async function loadCatalog(): Promise<{
  byArtistKey: Map<string, CatalogCandidate[]>;
  byRvtr: Map<string, CatalogCandidate>;
}> {
  const rows = await inspectQuery<{
    rvtr: string;
    identity_source: string;
    canonical_artist_name: string;
    canonical_title: string;
    normalized_title_key: string | null;
    graph_title: string | null;
    peak_hot100_position: number | null;
  }>(
    `
    SELECT upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
           coalesce(ctd.identity_source, 'missing') AS identity_source,
           coalesce(ctd.canonical_artist_name, '') AS canonical_artist_name,
           coalesce(ctd.canonical_title, '') AS canonical_title,
           ctd.normalized_title_key,
           t.title AS graph_title,
           ctd.peak_hot100_position
    FROM canonical_track_display ctd
    LEFT JOIN canonical_tracks ct ON ct.id = ctd.id
    LEFT JOIN canonical_track_versions ctv ON ctv.canonical_track_id = ct.id AND ctv.is_primary IS TRUE
    LEFT JOIN tracks t ON t.id = ctv.graph_track_id
    WHERE coalesce(ctd.retroverse_track_id, ctd.track_id) ~* '^RVTR[0-9]{6}$'
    `,
    [],
  );

  const byArtistKey = new Map<string, CatalogCandidate[]>();
  const byRvtr = new Map<string, CatalogCandidate>();

  for (const row of rows) {
    const candidate: CatalogCandidate = {
      rvtr: row.rvtr,
      identitySource: row.identity_source,
      artist: row.canonical_artist_name,
      canonicalTitle: row.canonical_title,
      graphTitle: row.graph_title,
      normalizedTitleKey: row.normalized_title_key,
      titleKey: canonicalTitleKey({
        normalizedTitleKey: row.normalized_title_key,
        graphTitle: row.graph_title,
        canonicalTitle: row.canonical_title,
      }),
      peakHot100: row.peak_hot100_position,
    };
    byRvtr.set(row.rvtr, candidate);

    for (const key of artistLookupKeys(row.canonical_artist_name)) {
      const bucket = byArtistKey.get(key) ?? [];
      bucket.push(candidate);
      byArtistKey.set(key, bucket);
    }
  }

  return { byArtistKey, byRvtr };
}

function collectArtistCandidates(
  fileArtist: string,
  byArtistKey: Map<string, CatalogCandidate[]>,
): CatalogCandidate[] {
  const seen = new Set<string>();
  const out: CatalogCandidate[] = [];
  for (const key of artistLookupKeys(fileArtist)) {
    for (const row of byArtistKey.get(key) ?? []) {
      if (seen.has(row.rvtr)) continue;
      if (!artistsMatch(fileArtist, row.artist)) continue;
      seen.add(row.rvtr);
      out.push(row);
    }
  }
  return out;
}

function simulateMatch(
  track: VideoLibraryTrack,
  byArtistKey: Map<string, CatalogCandidate[]>,
): {
  candidate: CatalogCandidate | null;
  containmentScore: number;
  bucket: ConfidenceBucket | "unresolved";
  confidence: number;
} {
  if (!track.artist.trim() || !track.title.trim()) {
    return { candidate: null, containmentScore: 0, bucket: "unresolved", confidence: 0 };
  }

  const videoKey = normalizeVideoTitleKey(track.title);
  if (!videoKey || videoKey.length < 3) {
    return { candidate: null, containmentScore: 0, bucket: "unresolved", confidence: 0 };
  }

  const pool = collectArtistCandidates(track.artist, byArtistKey);
  if (pool.length === 0) {
    return { candidate: null, containmentScore: 0, bucket: "suspicious", confidence: 0 };
  }

  let best: { candidate: CatalogCandidate; containmentScore: number } | null = null;
  for (const candidate of pool) {
    const cs = titleContainmentScore(candidate.titleKey, videoKey);
    if (cs < 65) continue;
    if (
      !best ||
      compareCandidates(
        { identitySource: candidate.identitySource, containmentScore: cs, peakHot100: candidate.peakHot100 },
        { identitySource: best.candidate.identitySource, containmentScore: best.containmentScore, peakHot100: best.candidate.peakHot100 },
      ) < 0
    ) {
      best = { candidate, containmentScore: cs };
    }
  }

  if (!best) {
    return { candidate: null, containmentScore: 0, bucket: "suspicious", confidence: 0 };
  }

  const bucket = classifySimulatedBucket({
    artistMatched: true,
    containmentScore: best.containmentScore,
    identitySource: best.candidate.identitySource,
    hasCandidate: true,
  });
  const confidence = simulationConfidence({
    artistMatched: true,
    containmentScore: best.containmentScore,
    identitySource: best.candidate.identitySource,
    bucket,
  });

  return {
    candidate: best.candidate,
    containmentScore: best.containmentScore,
    bucket,
    confidence,
  };
}

function classifyCurrentAssignment(
  track: VideoLibraryTrack,
  meta: {
    identity_source: string;
    canonical_artist_name: string;
    canonical_title: string;
    has_hot100: boolean;
  } | null,
  featCorrupt: boolean,
): ConfidenceBucket | "unresolved" {
  if (!track.rvtr) return "unresolved";
  if (!meta) return "suspicious";

  const graphArtist = meta.canonical_artist_name;
  const graphTitle = meta.canonical_title;
  const artistScore = matchSimilarityScore(track.artist, graphArtist);
  const titleScore = matchSimilarityScore(track.title, graphTitle);
  const baseTitleScore = matchSimilarityScore(
    baseTitleForMatch(track.title),
    baseTitleForMatch(graphTitle),
  );
  const combinedScore = combinedMatchScore(track.artist, track.title, {
    rvtr: track.rvtr,
    canonical_artist_name: graphArtist,
    canonical_title: graphTitle,
    peak_hot100_position: null,
    first_chart_date: null,
    has_hot100: meta.has_hot100,
  });

  const flags: string[] = [];
  if (featCorrupt) flags.push("feat_corruption");

  return classifyMatchConfidence({
    artistScore,
    titleScore,
    baseTitleScore,
    combinedScore,
    identitySource: meta.identity_source,
    flags,
  });
}

export async function runMatchEngineSimulation(): Promise<MatchEngineSimulationReport> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");

  const [tracks, catalog, corruptRows] = await Promise.all([
    loadAllVideoLibraryTracks(),
    loadCatalog(),
    inspectQuery<{ rvtr: string }>(
      `
      SELECT upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr
      FROM canonical_track_display ctd
      WHERE ${FEAT_CORRUPTION_SQL}
      `,
      [],
    ),
  ]);

  const featCorrupt = new Set(corruptRows.map((r) => r.rvtr));
  const assignedRvtrs = [...new Set(tracks.filter((t) => t.rvtr).map((t) => t.rvtr!.toUpperCase()))];
  const metaRows = await inspectQuery<{
    rvtr: string;
    identity_source: string;
    canonical_artist_name: string;
    canonical_title: string;
    has_hot100: boolean;
  }>(
    `
    SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
           coalesce(identity_source, 'missing') AS identity_source,
           coalesce(canonical_artist_name, '') AS canonical_artist_name,
           coalesce(canonical_title, '') AS canonical_title,
           coalesce(has_hot100, false) AS has_hot100
    FROM canonical_track_display
    WHERE upper(trim(coalesce(retroverse_track_id, track_id))) = ANY($1::text[])
    `,
    [assignedRvtrs],
  );
  const metaByRvtr = new Map(metaRows.map((r) => [r.rvtr, r]));

  const currentBuckets = emptyBuckets();
  const simulatedBuckets = emptyBuckets();
  const rows: SimulationRow[] = [];

  let bucketImproved = 0;
  let bucketDegraded = 0;
  let unchanged = 0;
  let reassignmentOpportunities = 0;
  let vdjToCanonical = 0;
  let currentReviewItems = 0;
  let simulatedReviewItems = 0;
  let reviewDisappeared = 0;
  let unresolvedNowMatchable = 0;
  let unresolvedAutoMatch = 0;
  let identityCanonicalBefore = 0;
  let identityCanonicalAfter = 0;
  let simulatedUnresolved = 0;

  for (const track of tracks) {
    const currentRvtr = track.rvtr?.toUpperCase() ?? null;
    const currentMeta = currentRvtr ? metaByRvtr.get(currentRvtr) : null;
    const currentIdentity = currentMeta?.identity_source ?? null;
    const currentBucket = classifyCurrentAssignment(
      track,
      currentMeta ?? null,
      currentRvtr ? featCorrupt.has(currentRvtr) : false,
    );

    currentBuckets[currentBucket] += 1;
    if (currentRvtr && isCanonicalIdentity(currentIdentity)) identityCanonicalBefore += 1;
    if (wouldReview(currentBucket as ConfidenceBucket)) currentReviewItems += 1;

    const sim = simulateMatch(track, catalog.byArtistKey);
    const simulatedRvtr = sim.candidate?.rvtr ?? null;
    const simulatedIdentity = sim.candidate?.identitySource ?? null;
    const simulatedBucket = sim.bucket;

    if (!currentRvtr && simulatedBucket !== "unresolved" && simulatedBucket !== "suspicious") {
      unresolvedNowMatchable += 1;
    }
    if (!currentRvtr && wouldAutoAssign(simulatedBucket as ConfidenceBucket)) {
      unresolvedAutoMatch += 1;
    }

    simulatedBuckets[simulatedBucket] += 1;
    if (!wouldAutoAssign(simulatedBucket as ConfidenceBucket) && !wouldReview(simulatedBucket as ConfidenceBucket)) {
      simulatedUnresolved += 1;
    }
    if (simulatedRvtr && isCanonicalIdentity(simulatedIdentity)) identityCanonicalAfter += 1;
    if (wouldReview(simulatedBucket as ConfidenceBucket)) simulatedReviewItems += 1;

    const curRank = currentBucket === "unresolved" ? 0 : bucketRank(currentBucket);
    const simRank = bucketRank(simulatedBucket as ConfidenceBucket);
    const improved = simRank > curRank;
    const degraded = simRank < curRank && currentBucket !== "unresolved";
    if (improved) bucketImproved += 1;
    else if (degraded) bucketDegraded += 1;
    else unchanged += 1;

    const reassignment =
      Boolean(currentRvtr && simulatedRvtr && currentRvtr !== simulatedRvtr && wouldAutoAssign(simulatedBucket as ConfidenceBucket));
    if (reassignment) reassignmentOpportunities += 1;

    const vdjCanon =
      Boolean(currentRvtr && simulatedRvtr && currentIdentity === "vdj" && isCanonicalIdentity(simulatedIdentity));
    if (vdjCanon) vdjToCanonical += 1;

    if (wouldReview(currentBucket as ConfidenceBucket) && wouldAutoAssign(simulatedBucket as ConfidenceBucket)) {
      reviewDisappeared += 1;
    }

    rows.push({
      filePath: track.filePath,
      fileArtist: track.artist,
      fileTitle: track.title,
      currentRvtr,
      currentIdentity,
      currentBucket,
      simulatedRvtr,
      simulatedIdentity,
      simulatedBucket,
      simulatedConfidence: sim.confidence,
      containmentScore: sim.containmentScore,
      reassignment,
      bucketImproved: improved,
      vdjToCanonical: vdjCanon,
    });
  }

  const reassignmentRows = rows
    .filter((r) => r.reassignment)
    .sort((a, b) => b.simulatedConfidence - a.simulatedConfidence);

  return {
    scannedAt: new Date().toISOString(),
    inventory: {
      totalVideoFiles: tracks.length,
      assigned: tracks.filter((t) => t.rvtr).length,
      unresolved: tracks.filter((t) => !t.rvtr).length,
    },
    currentBuckets,
    simulatedBuckets,
    impact: {
      bucketImproved,
      bucketDegraded,
      unchanged,
      reassignmentOpportunities: reassignmentRows.length,
      vdjToCanonical,
      currentReviewItems,
      simulatedReviewItems,
      reviewDisappeared,
      unresolvedNowMatchable,
      unresolvedAutoMatch,
      simulatedWouldRemainUnassigned: simulatedUnresolved,
      identityCanonicalBefore,
      identityCanonicalAfter,
    },
    reassignmentSample: reassignmentRows.slice(0, 25),
    allReassignments: reassignmentRows,
    examples: {
      newlyMatched: rows.filter((r) => !r.currentRvtr && r.simulatedBucket !== "suspicious" && r.simulatedBucket !== "unresolved").slice(0, 10),
      vdjToCanonical: rows.filter((r) => r.vdjToCanonical).slice(0, 10),
      reviewToAuto: rows.filter((r) => wouldReview(r.currentBucket as ConfidenceBucket) && wouldAutoAssign(r.simulatedBucket as ConfidenceBucket)).slice(0, 10),
    },
    allRows: rows,
  };
}

export function formatMatchEngineSimulationMarkdown(report: MatchEngineSimulationReport): string {
  const c = report.currentBuckets;
  const s = report.simulatedBuckets;
  const total = report.inventory.totalVideoFiles;
  const i = report.impact;

  return `# Match Engine Simulation — Entire VIDEO Library

**Scanned:** ${report.scannedAt}  
**Simulation only** — no label writes, no database.xml changes.

---

## Inventory

| Metric | Count |
|--------|------:|
| Total VIDEO files | ${total.toLocaleString()} |
| Assigned (RVTR label) | ${report.inventory.assigned.toLocaleString()} |
| Unresolved (no RVTR) | ${report.inventory.unresolved.toLocaleString()} |

---

## Current state (existing labels + legacy scoring)

| Bucket | Count | % |
|--------|------:|--:|
| Exact | ${c.exact} | ${pct(c.exact, total)}% |
| High | ${c.high} | ${pct(c.high, total)}% |
| Medium | ${c.medium} | ${pct(c.medium, total)}% |
| Low | ${c.low} | ${pct(c.low, total)}% |
| Suspicious | ${c.suspicious} | ${pct(c.suspicious, total)}% |
| Unresolved (no label) | ${c.unresolved} | ${pct(c.unresolved, total)}% |

---

## Simulated state (new engine — artist catalog + title containment + identity preference)

| Bucket | Count | % | Δ vs current |
|--------|------:|--:|--:|
| Exact | ${s.exact} | ${pct(s.exact, total)}% | ${s.exact - c.exact >= 0 ? "+" : ""}${s.exact - c.exact} |
| High | ${s.high} | ${pct(s.high, total)}% | ${s.high - c.high >= 0 ? "+" : ""}${s.high - c.high} |
| Medium | ${s.medium} | ${pct(s.medium, total)}% | ${s.medium - c.medium >= 0 ? "+" : ""}${s.medium - c.medium} |
| Low | ${s.low} | ${pct(s.low, total)}% | ${s.low - c.low >= 0 ? "+" : ""}${s.low - c.low} |
| Suspicious | ${s.suspicious} | ${pct(s.suspicious, total)}% | ${s.suspicious - c.suspicious >= 0 ? "+" : ""}${s.suspicious - c.suspicious} |
| Unresolved | ${s.unresolved} | ${pct(s.unresolved, total)}% | ${s.unresolved - c.unresolved >= 0 ? "+" : ""}${s.unresolved - c.unresolved} |

---

## Impact summary

| Metric | Count |
|--------|------:|
| **Bucket improved** | **${i.bucketImproved}** |
| Bucket degraded | ${i.bucketDegraded} |
| Unchanged | ${i.unchanged} |
| **Reassignment opportunities** (auto-worthy, different RVTR) | **${i.reassignmentOpportunities}** |
| **VDJ → canonical identity** | **${i.vdjToCanonical}** |
| Chart/canonical identity (assigned labels today) | ${i.identityCanonicalBefore} |
| Chart/canonical identity (simulated) | ${i.identityCanonicalAfter} (+${i.identityCanonicalAfter - i.identityCanonicalBefore}) |
| Current review-tier (medium) | ${i.currentReviewItems} |
| Simulated review-tier | ${i.simulatedReviewItems} |
| **Review → auto (disappeared)** | **${i.reviewDisappeared}** |
| **Unresolved → matchable** (medium+) | **${i.unresolvedNowMatchable}** |
| **Unresolved → auto-match** (exact/high) | **${i.unresolvedAutoMatch}** |
| Simulated would remain unassigned (no auto/review) | ${i.simulatedWouldRemainUnassigned} |

---

## Reassignment sample (top confidence)

${report.reassignmentSample
  .slice(0, 12)
  .map(
    (r) =>
      `- **${r.fileArtist} — ${r.fileTitle}** · \`${r.currentRvtr}\` (${r.currentIdentity}) → \`${r.simulatedRvtr}\` (${r.simulatedIdentity}) · ${r.simulatedConfidence}% · ${r.simulatedBucket}`,
  )
  .join("\n")}

---

## Newly matchable (was unresolved)

${report.examples.newlyMatched
  .map(
    (r) =>
      `- **${r.fileArtist} — ${r.fileTitle}** → \`${r.simulatedRvtr}\` (${r.simulatedIdentity}) · ${r.simulatedBucket} · ${r.simulatedConfidence}%`,
  )
  .join("\n") || "—"}

---

## Scoring model

1. **Artist first** — compact key, limit to artist catalog
2. **Title containment** — canonical title key contained in video title key → 100%; partial = matched chars ÷ canonical length
3. **Canonical title source** — \`normalized_title_key\` / graph title (avoids Feat corruption in display title)
4. **Identity preference** — hot100 → hot100_vdj → other → vdj

---

## Outputs

- \`simulation-summary.json\`
- \`reassignment-opportunities.csv\`
`;
}

export function reassignmentOpportunitiesToCsv(rows: SimulationRow[]): string {
  const header = [
    "fileArtist",
    "fileTitle",
    "currentRvtr",
    "proposedRvtr",
    "currentIdentity",
    "proposedIdentity",
    "confidence",
    "simulatedBucket",
    "containmentScore",
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
        r.fileArtist,
        r.fileTitle,
        r.currentRvtr,
        r.simulatedRvtr,
        r.currentIdentity,
        r.simulatedIdentity,
        r.simulatedConfidence,
        r.simulatedBucket,
        r.containmentScore,
        r.filePath,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}
