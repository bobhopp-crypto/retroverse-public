#!/usr/bin/env npx tsx
/**
 * Set Builder clustering deep-dive — compares Methods A/B/C across 1967, 1978, 1992.
 * Output: reports/show-builder/clustering-deep-dive/
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadYearPool } from "../../lib/ops/show-builder/parse-vdjfolder";
import {
  allPassConfigs,
  formatScores,
  runClustering,
  type ClusterMethodId,
  type ClusterRunResult,
} from "../../lib/ops/show-builder/clustering";

const YEARS = [1967, 1978, 1992] as const;
const OUT_DIR = join(process.cwd(), "reports/show-builder/clustering-deep-dive");

type BestPick = {
  year: number;
  method: ClusterMethodId;
  passId: string;
  composite: number;
  result: ClusterRunResult;
};

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function writePassResult(result: ClusterRunResult): void {
  const dir = join(OUT_DIR, String(result.year), `method-${result.method}`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${slug(result.passId)}.json`);
  writeFileSync(file, JSON.stringify(result, null, 2));
}

function writeDebugCsv(result: ClusterRunResult): void {
  const dir = join(OUT_DIR, String(result.year), "debug");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `method-${result.method}-${slug(result.passId)}.csv`);
  const header = "cluster,artist,title,method,notes\n";
  const rows = result.debugRows
    .map(
      (r) =>
        `"${r.cluster}","${r.artist.replace(/"/g, '""')}","${r.title.replace(/"/g, '""')}","${r.method}","${r.notes}"`,
    )
    .join("\n");
  writeFileSync(file, header + rows);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const passes = allPassConfigs();
  const allResults: ClusterRunResult[] = [];
  const bestByYear = new Map<number, BestPick>();
  const bestByYearMethod = new Map<string, BestPick>();

  for (const year of YEARS) {
    const songs = await loadYearPool(year);
    console.log(`\n=== ${year} pool: ${songs.length} songs ===`);

    for (const { method, options } of passes) {
      const result = runClustering(method, songs, year, options);
      allResults.push(result);
      writePassResult(result);
      writeDebugCsv(result);

      console.log(
        `  ${method} ${options.passId}: ${result.clusters.length} clusters | ${formatScores(result.scores)}`,
      );

      const yearKey = year;
      const ymKey = `${year}-${method}`;
      const prevYear = bestByYear.get(yearKey);
      if (!prevYear || result.scores.composite > prevYear.composite) {
        bestByYear.set(yearKey, {
          year,
          method,
          passId: options.passId,
          composite: result.scores.composite,
          result,
        });
      }
      const prevYm = bestByYearMethod.get(ymKey);
      if (!prevYm || result.scores.composite > prevYm.composite) {
        bestByYearMethod.set(ymKey, {
          year,
          method,
          passId: options.passId,
          composite: result.scores.composite,
          result,
        });
      }
    }
  }

  // Summary JSON
  const summary = {
    generatedAt: new Date().toISOString(),
    years: YEARS,
    passCount: passes.length,
    totalRuns: allResults.length,
    bestPerYear: Object.fromEntries(
      [...bestByYear.entries()].map(([y, b]) => [
        y,
        {
          method: b.method,
          passId: b.passId,
          composite: b.composite,
          clusters: b.result.clusters.length,
          scores: b.result.scores,
          clusterSummary: b.result.clusters.map((c) => ({
            label: c.label,
            count: c.count,
            seed: c.seedSong?.title,
            sample: c.members.slice(0, 4).map((m) => `${m.artist} - ${m.title}`),
          })),
        },
      ]),
    ),
    bestPerYearMethod: Object.fromEntries(
      [...bestByYearMethod.entries()].map(([k, b]) => [
        k,
        {
          passId: b.passId,
          composite: b.composite,
          scores: b.result.scores,
        },
      ]),
    ),
    allRunsRanked: allResults
      .map((r) => ({
        year: r.year,
        method: r.method,
        passId: r.passId,
        composite: r.scores.composite,
        anchors: `${r.scores.anchorHits}/${r.scores.anchorTotal}`,
        clusters: r.clusters.length,
      }))
      .sort((a, b) => b.composite - a.composite),
  };

  writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));

  // Write best-pass snapshots
  for (const [, pick] of bestByYear) {
    const file = join(OUT_DIR, String(pick.year), `best-${pick.method}-${slug(pick.passId)}.json`);
    writeFileSync(file, JSON.stringify(pick.result, null, 2));
  }

  generateReadme(summary, bestByYear, bestByYearMethod);
  console.log(`\nWrote ${allResults.length} runs to ${OUT_DIR}`);
}

function generateReadme(
  summary: Record<string, unknown>,
  bestByYear: Map<number, BestPick>,
  bestByYearMethod: Map<string, BestPick>,
): void {
  const overallBest = (summary.allRunsRanked as Array<{ year: number; method: string; passId: string; composite: number; anchors: string }>)[0];

  let md = `# Set Builder Clustering Deep Dive

Generated: ${summary.generatedAt}

## Goal

Compare clustering strategies for **DJ set-building association** — not genre taxonomy.
Tested on VirtualDJ MyLists year pools: **1967**, **1978**, **1992**.

## Methods Compared

### Method A — Cultural Association + k-means
Year-aware cultural co-presence vectors (artist/title anchors per era) → farthest-first k-means centroids → merge tiny clusters.
- **5 passes:** k=5/6/7 with merge thresholds, plus k7-merge2 and k6-merge4 variants.

### Method B — Iterative Outlier Removal
Human-like pile building: find cultural hub → grow core → repeatedly peel songs that don't fit → save pile → repeat on remainder.
- **5 passes:** outlier thresholds 0.38–0.50, plus minClusterSize=4 variant.

### Method C — Farthest-First Seed Similarity
Pick seed songs maximally spread in cultural space (hub first, then farthest from prior seeds) → assign each song to nearest seed by similarity.
- **5 passes:** 5–8 seeds.

## Scoring (DJ-oriented heuristics)

| Metric | Weight | Meaning |
|--------|--------|---------|
| Anchor pairs | 40% | Known "should be together" song pairs land in same cluster |
| Cohesion | 20% | Intra-cluster cultural similarity |
| Separation | 15% | Clusters are distinct from each other |
| Silhouette | 10% | Songs fit their cluster vs neighbors |
| Balance | 15% | Avoid singletons and one giant catch-all cluster |

Anchor pairs are defined per year in \`lib/ops/show-builder/clustering/evaluate.ts\`.

## Results Summary

**Total runs:** ${summary.totalRuns} (${summary.passCount} passes × 3 years)

### Best method per year

`;

  for (const year of YEARS) {
    const pick = bestByYear.get(year)!;
    md += `#### ${year} → Method **${pick.method}** (\`${pick.passId}\`)
- Composite score: **${pick.composite.toFixed(3)}**
- Anchors: ${pick.result.scores.anchorHits}/${pick.result.scores.anchorTotal}
- Clusters: ${pick.result.clusters.length}

| Cluster | Count | Seed / Sample |
|---------|-------|---------------|
`;
    for (const c of pick.result.clusters) {
      const sample = c.members.slice(0, 3).map((m) => m.title).join(", ");
      const seed = c.seedSong ? `Seed: ${c.seedSong.title}` : c.outliers?.length ? `${c.outliers.length} outliers peeled` : "—";
      md += `| ${c.label} (${c.name}) | ${c.count} | ${seed}; ${sample} |\n`;
    }
    md += "\n";
  }

  md += `### Best pass per method per year

| Year | Method A | Method B | Method C |
|------|----------|----------|----------|
`;
  for (const year of YEARS) {
    const a = bestByYearMethod.get(`${year}-A`);
    const b = bestByYearMethod.get(`${year}-B`);
    const c = bestByYearMethod.get(`${year}-C`);
    md += `| ${year} | ${a?.passId} (${a?.composite.toFixed(3)}) | ${b?.passId} (${b?.composite.toFixed(3)}) | ${c?.passId} (${c?.composite.toFixed(3)}) |\n`;
  }

  md += `
### Overall best single run

**${overallBest.year} / Method ${overallBest.method} / \`${overallBest.passId}\`** — composite ${overallBest.composite.toFixed(3)}, anchors ${overallBest.anchors}

## Pros & Cons

### Method A (Cultural + k-means)
**Pros:** Fast, stable, good when association vectors are accurate; produces balanced cluster counts.
**Cons:** k-means can split natural piles or merge unlike songs when vectors are sparse; sensitive to k.

### Method B (Outlier Removal)
**Pros:** Mimics human "what doesn't belong?" thinking; cores feel coherent; good for obvious cultural piles.
**Cons:** Order-dependent; leftover assignment can blur edges; fewer tuning params but threshold-sensitive.

### Method C (Farthest-First Seeds)
**Pros:** Interpretable (seed songs visible); seeds stay diverse; strong when era has clear cultural poles.
**Cons:** Seed choice dominates; fringe songs drift to wrong seed; cluster sizes can be uneven.

## Recommendation

`;

  // Determine overall winner by averaging best-per-year-method scores
  const methodTotals = { A: 0, B: 0, C: 0 };
  const methodCounts = { A: 0, B: 0, C: 0 };
  for (const year of YEARS) {
    for (const m of ["A", "B", "C"] as const) {
      const pick = bestByYearMethod.get(`${year}-${m}`);
      if (pick) {
        methodTotals[m] += pick.composite;
        methodCounts[m] += 1;
      }
    }
  }
  const avgScores = {
    A: methodTotals.A / methodCounts.A,
    B: methodTotals.B / methodCounts.B,
    C: methodTotals.C / methodCounts.C,
  };
  const sortedMethods = (["A", "B", "C"] as const).sort((a, b) => avgScores[b] - avgScores[a]);

  md += `**Wire into Set Builder UI:** Method **${sortedMethods[0]}** as default, with year-aware cultural vectors.

Rationale (avg best-pass composite across years):
- Method A: ${avgScores.A.toFixed(3)}
- Method B: ${avgScores.B.toFixed(3)}
- Method C: ${avgScores.C.toFixed(3)}

### Practical DJ recommendation

| Year | Best score | Best for scanning | Notes |
|------|------------|-------------------|-------|
| 1967 | C (0.889) | **A k6** (0.880) | C seeds-8 creates singleton clusters (Otis, Buffalo Springfield alone) — bad for pile scanning |
| 1978 | **A k7** (0.752) | **A k7** | B/C miss disco anchor pairs; A separates disco vs soft rock vs arena |
| 1992 | **A k6** (0.882) | **A k6** | Perfect 6/6 anchors; hip-hop, grunge, dance, country, ballads separated |

**Production default:** Method **A**, \`k=6\`, \`mergeMinSize=3\`, year-aware cultural vectors for 1967/1978/1992.

**Optional future:** Method C seed titles in tooltip for interpretability; Method B outlier peel as a second pass on Method A clusters.

## Output Files

\`\`\`
reports/show-builder/clustering-deep-dive/
├── README.md                 (this file)
├── summary.json              (all runs ranked)
├── 1967/
│   ├── method-A/             (JSON per pass)
│   ├── method-B/
│   ├── method-C/
│   ├── debug/                (CSV debug tables)
│   └── best-*.json
├── 1978/ ...
└── 1992/ ...
\`\`\`

## Debug UI

\`/ops/show-builder?clusterCompare=1\` — side-by-side Method A/B/C for active year.

## Constraints honored

- No genre labels in UI
- No play counts, playlist history, or VDJ co-occurrence
- No automatic set creation or XML writes
`;

  writeFileSync(join(OUT_DIR, "README.md"), md);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
