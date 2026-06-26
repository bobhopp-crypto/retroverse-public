import "server-only";

import { readFile } from "node:fs/promises";

import { loadChartUniverseIndex } from "@/lib/ops/browser-plus/chart-universe";
import { isUnmatchedVideoTrackPath } from "@/lib/ops/browser-plus/load-unmatched-video-tracks";
import { loadSongPackageIndex } from "@/lib/ops/intelligence/song-package-store";
import { normVdjPath, vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

const RVTR_RE = /RVTR\d{6}/i;

export type MatchedVideoTrack = {
  filePath: string;
  filePathNorm: string;
  artist: string;
  title: string;
  rvtr: string;
};

export type ConflictReassignment = {
  filePath: string;
  filePathNorm: string;
  currentRvtr: string;
  canonicalRvtr: string;
};

export type IdentityDistribution = {
  hot100: number;
  hot100_vdj: number;
  vdj: number;
  other: number;
  missing: number;
  total: number;
};

export type CanonicalCoverageAudit = {
  scannedAt: string;
  matchedVideoCount: number;
  conflictCount: number;
  conflictsApplied: number;
  identityBefore: IdentityDistribution;
  identityAfter: IdentityDistribution;
  chartCoverage: {
    hot100Universe: number;
    labelOwnedBefore: number;
    labelOwnedAfter: number;
    labelOwnedPctBefore: number;
    labelOwnedPctAfter: number;
    labelGain: number;
  };
  artistCoverage: {
    hot100Artists: number;
    artistsWithVideoBefore: number;
    artistsWithVideoAfter: number;
    artistsWithCanonicalVideoBefore: number;
    artistsWithCanonicalVideoAfter: number;
    artistGain: number;
    canonicalArtistGain: number;
  };
  packageCoverage: {
    withIntelligencePackageBefore: number;
    withIntelligencePackageAfter: number;
    withAnyPackageBefore: number;
    withAnyPackageAfter: number;
    withHot100Before: number;
    withHot100After: number;
    intelligencePackageGain: number;
    anyPackageGain: number;
    hot100Gain: number;
  };
  reassignmentSample: Array<{
    filePath: string;
    beforeRvtr: string;
    afterRvtr: string;
    beforeSource: string;
    afterSource: string;
  }>;
};

function decodeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readAttr(block: string, name: string): string {
  const re = new RegExp(`\\s${name}="([^"]*)"`);
  const m = block.match(re);
  return m?.[1] ? decodeXmlAttr(m[1]) : "";
}

function rvtrFromLabel(label: string): string | null {
  const match = label.match(RVTR_RE);
  return match?.[0]?.toUpperCase() ?? null;
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

function emptyDistribution(): IdentityDistribution {
  return { hot100: 0, hot100_vdj: 0, vdj: 0, other: 0, missing: 0, total: 0 };
}

function countByIdentity(
  tracks: MatchedVideoTrack[],
  sourceByRvtr: Map<string, string | null>,
): IdentityDistribution {
  const out = emptyDistribution();
  out.total = tracks.length;
  for (const track of tracks) {
    const src = sourceByRvtr.get(track.rvtr.toUpperCase()) ?? "missing";
    if (src === "hot100") out.hot100 += 1;
    else if (src === "hot100_vdj") out.hot100_vdj += 1;
    else if (src === "vdj") out.vdj += 1;
    else if (src === "missing") out.missing += 1;
    else out.other += 1;
  }
  return out;
}

function isIntelligencePackageStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return status === "published" || status === "cards_ready" || status === "approved";
}

/** VIDEO-folder tracks with RVTR label from database.xml. */
export async function loadMatchedVideoTracks(): Promise<MatchedVideoTrack[]> {
  const path = vdjDatabasePath();
  const xml = await readFile(path, "utf8");
  const out: MatchedVideoTrack[] = [];
  const songRe = /<Song\s+FilePath="([^"]*)"[^>]*>([\s\S]*?)<\/Song>/g;
  let m: RegExpExecArray | null;

  while ((m = songRe.exec(xml)) !== null) {
    const filePath = decodeXmlAttr(m[1] ?? "").replace(/\\/g, "/");
    if (!isUnmatchedVideoTrackPath(filePath)) continue;

    const inner = m[2] ?? "";
    const tagsAttrs = inner.match(/<Tags([^>]*)\/?>/)?.[1] ?? "";
    const label = readAttr(tagsAttrs, "Label").trim();
    const rvtr = rvtrFromLabel(label);
    if (!rvtr) continue;

    out.push({
      filePath,
      filePathNorm: normVdjPath(filePath),
      artist: readAttr(tagsAttrs, "Author").trim(),
      title: readAttr(tagsAttrs, "Title").trim(),
      rvtr,
    });
  }

  return out;
}

function parseConflictCsv(csv: string): ConflictReassignment[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const out: ConflictReassignment[] = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length < 8) continue;
    const filePath = cols[2]?.trim() ?? "";
    const currentRvtr = cols[3]?.trim().toUpperCase() ?? "";
    const canonicalRvtr = cols[6]?.trim().toUpperCase() ?? "";
    if (!currentRvtr || !canonicalRvtr || currentRvtr === canonicalRvtr) continue;
    out.push({
      filePath,
      filePathNorm: filePath ? normVdjPath(filePath) : "",
      currentRvtr,
      canonicalRvtr,
    });
  }
  return out;
}

function parseCsvLine(line: string): string[] {
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
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cols.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

export function simulateReassignments(
  tracks: MatchedVideoTrack[],
  conflicts: ConflictReassignment[],
): { tracks: MatchedVideoTrack[]; applied: number } {
  const byPath = new Map<string, string>();
  const byCurrentRvtr = new Map<string, string>();
  for (const conflict of conflicts) {
    if (conflict.filePathNorm) byPath.set(conflict.filePathNorm, conflict.canonicalRvtr);
    byCurrentRvtr.set(conflict.currentRvtr, conflict.canonicalRvtr);
  }

  let applied = 0;
  const next = tracks.map((track) => {
    const swap =
      (track.filePathNorm && byPath.get(track.filePathNorm)) ||
      byCurrentRvtr.get(track.rvtr.toUpperCase());
    if (!swap || swap === track.rvtr.toUpperCase()) return track;
    applied += 1;
    return { ...track, rvtr: swap };
  });

  return { tracks: next, applied };
}

export async function runCanonicalCoverageAudit(
  conflictCsvPath: string,
): Promise<CanonicalCoverageAudit> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");

  const [matchedTracks, conflictCsv, chartIndex, packageIndex] = await Promise.all([
    loadMatchedVideoTracks(),
    readFile(conflictCsvPath, "utf8"),
    loadChartUniverseIndex(),
    loadSongPackageIndex(),
  ]);

  const conflicts = parseConflictCsv(conflictCsv);
  const { tracks: afterTracks, applied } = simulateReassignments(matchedTracks, conflicts);

  const allRvtrs = [
    ...new Set([
      ...matchedTracks.map((t) => t.rvtr),
      ...afterTracks.map((t) => t.rvtr),
      ...conflicts.flatMap((c) => [c.currentRvtr, c.canonicalRvtr]),
    ]),
  ].map((rvtr) => rvtr.toUpperCase());

  const metaRows = await inspectQuery<{
    rvtr: string;
    identity_source: string | null;
    has_hot100: boolean;
    canonical_artist_name: string;
  }>(
    `
    SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
           identity_source,
           coalesce(has_hot100, false) AS has_hot100,
           coalesce(nullif(trim(canonical_artist_name), ''), '') AS canonical_artist_name
    FROM canonical_track_display
    WHERE upper(trim(coalesce(retroverse_track_id, track_id))) = ANY($1::text[])
    `,
    [allRvtrs],
  );

  const sourceByRvtr = new Map(metaRows.map((r) => [r.rvtr, r.identity_source]));
  const hot100ByRvtr = new Map(metaRows.map((r) => [r.rvtr, r.has_hot100]));
  const artistByRvtr = new Map(metaRows.map((r) => [r.rvtr, r.canonical_artist_name]));

  const packageStatusByRvtr = new Map(
    packageIndex.packages.map((p) => [p.rvtr.toUpperCase(), p.status]),
  );

  const identityBefore = countByIdentity(matchedTracks, sourceByRvtr);
  const identityAfter = countByIdentity(afterTracks, sourceByRvtr);

  function labelOwnedRvtrs(tracks: MatchedVideoTrack[]): Set<string> {
    return new Set(tracks.map((t) => t.rvtr.toUpperCase()));
  }

  const beforeLabels = labelOwnedRvtrs(matchedTracks);
  const afterLabels = labelOwnedRvtrs(afterTracks);

  let labelOwnedBefore = 0;
  let labelOwnedAfter = 0;
  for (const rvtr of chartIndex.hot100Rvtrs) {
    if (beforeLabels.has(rvtr)) labelOwnedBefore += 1;
    if (afterLabels.has(rvtr)) labelOwnedAfter += 1;
  }

  const hot100Universe = chartIndex.hot100Rvtrs.size;

  const artistToChartRvtrs = new Map<string, Set<string>>();
  for (const rvtr of chartIndex.hot100Rvtrs) {
    const artist = chartIndex.byRvtr.get(rvtr)?.canonical_artist_name?.trim();
    if (!artist) continue;
    const bucket = artistToChartRvtrs.get(artist) ?? new Set<string>();
    bucket.add(rvtr);
    artistToChartRvtrs.set(artist, bucket);
  }

  function artistsWithVideo(tracks: MatchedVideoTrack[], canonicalOnly: boolean): number {
    const labelSet = labelOwnedRvtrs(tracks);
    let count = 0;
    for (const [, chartRvtrs] of artistToChartRvtrs) {
      const hit = [...chartRvtrs].some((rvtr) => {
        if (!labelSet.has(rvtr)) return false;
        if (!canonicalOnly) return true;
        const src = sourceByRvtr.get(rvtr);
        return src === "hot100" || src === "hot100_vdj";
      });
      if (hit) count += 1;
    }
    return count;
  }

  function packageMetrics(tracks: MatchedVideoTrack[]) {
    let intelligence = 0;
    let anyPkg = 0;
    let hot100 = 0;
    for (const track of tracks) {
      const rvtr = track.rvtr.toUpperCase();
      const status = packageStatusByRvtr.get(rvtr) ?? null;
      if (status) anyPkg += 1;
      if (isIntelligencePackageStatus(status)) intelligence += 1;
      if (hot100ByRvtr.get(rvtr) === true) hot100 += 1;
    }
    return { intelligence, anyPkg, hot100 };
  }

  const pkgBefore = packageMetrics(matchedTracks);
  const pkgAfter = packageMetrics(afterTracks);

  const hot100Artists = artistToChartRvtrs.size;

  const reassignmentSample = conflicts.slice(0, 8).map((c) => ({
    filePath: c.filePath || `(by rvtr ${c.currentRvtr})`,
    beforeRvtr: c.currentRvtr,
    afterRvtr: c.canonicalRvtr,
    beforeSource: sourceByRvtr.get(c.currentRvtr) ?? "missing",
    afterSource: sourceByRvtr.get(c.canonicalRvtr) ?? "missing",
  }));

  return {
    scannedAt: new Date().toISOString(),
    matchedVideoCount: matchedTracks.length,
    conflictCount: conflicts.length,
    conflictsApplied: applied,
    identityBefore,
    identityAfter,
    chartCoverage: {
      hot100Universe,
      labelOwnedBefore,
      labelOwnedAfter,
      labelOwnedPctBefore: pct(labelOwnedBefore, hot100Universe),
      labelOwnedPctAfter: pct(labelOwnedAfter, hot100Universe),
      labelGain: labelOwnedAfter - labelOwnedBefore,
    },
    artistCoverage: {
      hot100Artists,
      artistsWithVideoBefore: artistsWithVideo(matchedTracks, false),
      artistsWithVideoAfter: artistsWithVideo(afterTracks, false),
      artistsWithCanonicalVideoBefore: artistsWithVideo(matchedTracks, true),
      artistsWithCanonicalVideoAfter: artistsWithVideo(afterTracks, true),
      artistGain: artistsWithVideo(afterTracks, false) - artistsWithVideo(matchedTracks, false),
      canonicalArtistGain:
        artistsWithVideo(afterTracks, true) - artistsWithVideo(matchedTracks, true),
    },
    packageCoverage: {
      withIntelligencePackageBefore: pkgBefore.intelligence,
      withIntelligencePackageAfter: pkgAfter.intelligence,
      withAnyPackageBefore: pkgBefore.anyPkg,
      withAnyPackageAfter: pkgAfter.anyPkg,
      withHot100Before: pkgBefore.hot100,
      withHot100After: pkgAfter.hot100,
      intelligencePackageGain: pkgAfter.intelligence - pkgBefore.intelligence,
      anyPackageGain: pkgAfter.anyPkg - pkgBefore.anyPkg,
      hot100Gain: pkgAfter.hot100 - pkgBefore.hot100,
    },
    reassignmentSample,
  };
}

export function formatCanonicalCoverageAuditMarkdown(audit: CanonicalCoverageAudit): string {
  const ib = audit.identityBefore;
  const ia = audit.identityAfter;
  const canonicalBefore = ib.hot100 + ib.hot100_vdj;
  const canonicalAfter = ia.hot100 + ia.hot100_vdj;

  return `# Canonical Coverage Audit

**Scanned:** ${audit.scannedAt}  
**Matched VIDEO tracks (RVTR label):** ${audit.matchedVideoCount.toLocaleString()}  
**Conflict reassignments simulated:** ${audit.conflictsApplied} files (${audit.conflictCount} conflict rows)  
Read-only — no assignments modified.

---

## Identity distribution (matched VIDEO files)

| identity_source | Before | % | After | % | Δ |
|-----------------|-------:|--:|------:|--:|--:|
| \`hot100\` | ${ib.hot100} | ${pct(ib.hot100, ib.total)}% | ${ia.hot100} | ${pct(ia.hot100, ia.total)}% | ${ia.hot100 - ib.hot100 >= 0 ? "+" : ""}${ia.hot100 - ib.hot100} |
| \`hot100_vdj\` | ${ib.hot100_vdj} | ${pct(ib.hot100_vdj, ib.total)}% | ${ia.hot100_vdj} | ${pct(ia.hot100_vdj, ia.total)}% | ${ia.hot100_vdj - ib.hot100_vdj >= 0 ? "+" : ""}${ia.hot100_vdj - ib.hot100_vdj} |
| **Chart layer (hot100 + hot100_vdj)** | **${canonicalBefore}** | **${pct(canonicalBefore, ib.total)}%** | **${canonicalAfter}** | **${pct(canonicalAfter, ia.total)}%** | **+${canonicalAfter - canonicalBefore}** |
| \`vdj\` | ${ib.vdj} | ${pct(ib.vdj, ib.total)}% | ${ia.vdj} | ${pct(ia.vdj, ia.total)}% | ${ia.vdj - ib.vdj} |
| other | ${ib.other} | ${pct(ib.other, ib.total)}% | ${ia.other} | ${pct(ia.other, ia.total)}% | ${ia.other - ib.other} |
| missing | ${ib.missing} | ${pct(ib.missing, ib.total)}% | ${ia.missing} | ${pct(ia.missing, ia.total)}% | ${ia.missing - ib.missing} |

---

## Chart coverage (Hot 100 universe, label-based)

Simulates: VIDEO label RVTR → canonical sibling for ${audit.conflictsApplied} conflicts.

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| Hot 100 chart RVTRs in universe | ${audit.chartCoverage.hot100Universe.toLocaleString()} | ${audit.chartCoverage.hot100Universe.toLocaleString()} | — |
| Chart RVTRs with VIDEO label | ${audit.chartCoverage.labelOwnedBefore.toLocaleString()} | ${audit.chartCoverage.labelOwnedAfter.toLocaleString()} | **+${audit.chartCoverage.labelGain}** |
| Chart label coverage | ${audit.chartCoverage.labelOwnedPctBefore}% | ${audit.chartCoverage.labelOwnedPctAfter}% | **+${(audit.chartCoverage.labelOwnedPctAfter - audit.chartCoverage.labelOwnedPctBefore).toFixed(1)}pp** |

---

## Artist coverage (Hot 100 artists with ≥1 VIDEO label)

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| Hot 100 artists in universe | ${audit.artistCoverage.hot100Artists.toLocaleString()} | ${audit.artistCoverage.hot100Artists.toLocaleString()} | — |
| Artists with any chart RVTR labeled | ${audit.artistCoverage.artistsWithVideoBefore.toLocaleString()} | ${audit.artistCoverage.artistsWithVideoAfter.toLocaleString()} | +${audit.artistCoverage.artistGain} |
| Artists with canonical-identity label | ${audit.artistCoverage.artistsWithCanonicalVideoBefore.toLocaleString()} | ${audit.artistCoverage.artistsWithCanonicalVideoAfter.toLocaleString()} | **+${audit.artistCoverage.canonicalArtistGain}** |

---

## Package coverage (matched VIDEO files)

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| Intelligence package (published/cards_ready/approved) | ${audit.packageCoverage.withIntelligencePackageBefore.toLocaleString()} | ${audit.packageCoverage.withIntelligencePackageAfter.toLocaleString()} | **+${audit.packageCoverage.intelligencePackageGain}** |
| Any package file | ${audit.packageCoverage.withAnyPackageBefore.toLocaleString()} | ${audit.packageCoverage.withAnyPackageAfter.toLocaleString()} | +${audit.packageCoverage.anyPackageGain} |
| Assigned RVTR has Hot 100 | ${audit.packageCoverage.withHot100Before.toLocaleString()} | ${audit.packageCoverage.withHot100After.toLocaleString()} | **+${audit.packageCoverage.hot100Gain}** |

---

## Sample reassignments

${audit.reassignmentSample
  .map(
    (s) =>
      `- \`${s.beforeRvtr}\` (${s.beforeSource}) → \`${s.afterRvtr}\` (${s.afterSource}) — ${s.filePath}`,
  )
  .join("\n")}

---

## Notes

- **Label-based simulation** — assumes VDJ label is the ownership signal for chart/artist coverage (graph \`media_track_links\` unchanged).
- Reassignments sourced from \`conflict-reassignment.csv\` (${audit.conflictCount} rows).
- Intelligence package counts use package index status; review packages with story cards not counted unless status qualifies.
`;
}
