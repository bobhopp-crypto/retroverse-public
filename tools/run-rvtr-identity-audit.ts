/**
 * RVTR Identity Audit — Match Agent auto-matched assignments.
 * Usage: npm run ops:rvtr-identity-audit
 */
require("./finance/preload-server-only.cjs");

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

function stripTitle(t: string): string {
  return t
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/\s*\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9\s']/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function baseTitleFromFile(t: string): string {
  return stripTitle(t)
    .replace(
      /\b(color|bw|extended|live|remix|edit|po edit|hq|official video|official|video|clean|dirty|radio|version|mix|instrumental|acoustic|demo)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function stripArtist(a: string): string {
  return a
    .replace(/^the\s+/i, "")
    .replace(/[^a-z0-9\s']/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compact(s: string): string {
  return stripTitle(s).replace(/\s+/g, "");
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

type AutoRow = {
  rvtr: string;
  artist: string;
  title: string;
  filePath: string;
  matchTier: string | null;
  combinedScore: number;
  matchedTitle: string | null;
  matchedArtist: string | null;
};

async function main() {
  const { inspectPing, inspectQuery } = await import("../lib/inspect/pg");
  if (!(await inspectPing()).ok) throw new Error("Postgres unavailable");

  const root = join(import.meta.dirname, "..");
  const reportPath = join(
    root,
    "reports/match-agent-phase-2/2026-06-24T01-28-05-401Z/results.json",
  );
  const json = JSON.parse(await readFile(reportPath, "utf8")) as {
    autoMatched: AutoRow[];
  };
  const rows = json.autoMatched.filter((r) => r.rvtr);
  const rvtrs = [...new Set(rows.map((r) => r.rvtr.toUpperCase()))];

  const metaRows = await inspectQuery<{
    rvtr: string;
    identity_source: string | null;
    has_hot100: boolean;
    has_vdj_media: boolean;
    canonical_title: string;
    canonical_artist_name: string;
    peak_hot100_position: number | null;
  }>(
    `
    SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
           identity_source, has_hot100, has_vdj_media,
           canonical_title, canonical_artist_name, peak_hot100_position
    FROM canonical_track_display
    WHERE upper(trim(coalesce(retroverse_track_id, track_id))) = ANY($1::text[])
    `,
    [rvtrs],
  );
  const meta = new Map(metaRows.map((m) => [m.rvtr, m]));

  const bySource: Record<string, number> = {
    hot100: 0,
    hot100_vdj: 0,
    vdj: 0,
    missing: 0,
  };
  const tierBySource: Record<string, Record<string, number>> = {};

  for (const row of rows) {
    const m = meta.get(row.rvtr.toUpperCase());
    const src = m?.identity_source ?? "missing";
    bySource[src] = (bySource[src] ?? 0) + 1;
    const tier = row.matchTier ?? "?";
    tierBySource[tier] = tierBySource[tier] ?? {};
    tierBySource[tier][src] = (tierBySource[tier][src] ?? 0) + 1;
  }

  const vdjRows = rows.filter((r) => meta.get(r.rvtr.toUpperCase())?.identity_source === "vdj");
  let vdjWithCanonicalAlt = 0;
  let vdjNoAlt = 0;
  const conflicts: Array<Record<string, unknown>> = [];
  const wrongLayerTierA: Array<Record<string, unknown>> = [];
  let fileBaseConflicts = 0;
  const fileBaseExamples: Array<Record<string, unknown>> = [];

  async function findChartCanonical(
    artistNorm: string,
    titleNorm: string,
    excludeRvtr: string,
  ) {
    const alts = await inspectQuery<{
      rvtr: string;
      identity_source: string;
      canonical_title: string;
      canonical_artist_name: string;
      peak_hot100_position: number | null;
    }>(
      `
      SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
             identity_source, canonical_title, canonical_artist_name, peak_hot100_position
      FROM canonical_track_display
      WHERE has_hot100 = true AND identity_source IN ('hot100', 'hot100_vdj')
        AND regexp_replace(lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i')), '[^a-z0-9]', '', 'g')
          = regexp_replace($1, '[^a-z0-9]', '', 'g')
        AND regexp_replace(regexp_replace(lower(trim(canonical_title)), '\\s*\\([^)]*\\)', '', 'g'), '[^a-z0-9]', '', 'g')
          = regexp_replace($2, '[^a-z0-9]', '', 'g')
      ORDER BY peak_hot100_position ASC NULLS LAST
      LIMIT 5
      `,
      [artistNorm, titleNorm],
    );
    return alts.find((a) => a.rvtr !== excludeRvtr.toUpperCase()) ?? null;
  }

  for (const row of vdjRows) {
    const m = meta.get(row.rvtr.toUpperCase());
    if (!m) continue;
    const alt = await findChartCanonical(
      stripArtist(m.canonical_artist_name),
      stripTitle(m.canonical_title),
      row.rvtr,
    );
    if (alt) {
      vdjWithCanonicalAlt++;
      const rec = {
        conflictKind: "graph_metadata",
        fileArtist: row.artist,
        fileTitle: row.title,
        filePath: row.filePath,
        assignedRvtr: row.rvtr,
        assignedGraphArtist: m.canonical_artist_name,
        assignedGraphTitle: m.canonical_title,
        canonicalRvtr: alt.rvtr,
        canonicalArtist: alt.canonical_artist_name,
        canonicalTitle: alt.canonical_title,
        canonicalPeak: alt.peak_hot100_position,
        canonicalSource: alt.identity_source,
        tier: row.matchTier,
        score: row.combinedScore,
      };
      conflicts.push(rec);
      if (row.matchTier === "A") wrongLayerTierA.push(rec);
    } else {
      vdjNoAlt++;
    }

    const fileAlt = await findChartCanonical(
      stripArtist(row.artist),
      baseTitleFromFile(row.title),
      row.rvtr,
    );
    if (fileAlt && !alt) {
      fileBaseConflicts++;
      fileBaseExamples.push({
        fileArtist: row.artist,
        fileTitle: row.title,
        assignedRvtr: row.rvtr,
        assignedGraphTitle: m.canonical_title,
        canonicalRvtr: fileAlt.rvtr,
        canonicalTitle: fileAlt.canonical_title,
        canonicalPeak: fileAlt.peak_hot100_position,
        tier: row.matchTier,
      });
    }
  }

  const inversions: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const m = meta.get(row.rvtr.toUpperCase());
    if (!m) continue;
    const fa = compact(row.artist);
    const ft = compact(row.title);
    const ga = compact(m.canonical_artist_name);
    const gt = compact(m.canonical_title);
    if (
      fa.length > 4 &&
      gt.length > 4 &&
      (fa === gt || fa.includes(gt) || gt.includes(fa)) &&
      fa !== ga
    ) {
      inversions.push({
        kind: "file_artist_matches_graph_title",
        fileArtist: row.artist,
        fileTitle: row.title,
        rvtr: row.rvtr,
        graphArtist: m.canonical_artist_name,
        graphTitle: m.canonical_title,
        source: m.identity_source,
        tier: row.matchTier,
      });
    }
    if (
      ft.length > 4 &&
      ga.length > 4 &&
      (ft === ga || ft.includes(ga) || ga.includes(ft)) &&
      ft !== gt
    ) {
      inversions.push({
        kind: "file_title_matches_graph_artist",
        fileArtist: row.artist,
        fileTitle: row.title,
        rvtr: row.rvtr,
        graphArtist: m.canonical_artist_name,
        graphTitle: m.canonical_title,
        source: m.identity_source,
        tier: row.matchTier,
      });
    }
  }

  const total = rows.length;
  const pureHot = bySource.hot100 ?? 0;
  const dual = bySource.hot100_vdj ?? 0;
  const vdj = bySource.vdj ?? 0;

  const outDir = join(root, "reports/match-agent-phase-2");
  const summary = {
    total,
    byIdentitySource: bySource,
    tierBySource,
    canonicalLayerCount: pureHot + dual,
    canonicalLayerPct: pct(pureHot + dual, total),
    vdjAssigned: vdjRows.length,
    vdjWithCanonicalChartAlt: vdjWithCanonicalAlt,
    vdjWithCanonicalChartAltPct: pct(vdjWithCanonicalAlt, vdjRows.length),
    vdjNoCanonicalAlt: vdjNoAlt,
    totalWrongLayer: vdjWithCanonicalAlt + fileBaseConflicts,
    totalWrongLayerPct: pct(vdjWithCanonicalAlt + fileBaseConflicts, vdjRows.length),
    vdjOnlyCorrect: vdjRows.length - vdjWithCanonicalAlt - fileBaseConflicts,
    wrongLayerTierA: wrongLayerTierA.length,
    fileBaseTitleConflicts: fileBaseConflicts,
    inversionCount: inversions.length,
    conflictCount: conflicts.length,
  };

  const md = `# RVTR Identity Audit — Match Agent Auto-Matched (${total})

**Source:** \`reports/match-agent-phase-2/2026-06-24T01-28-05-401Z/\` (live run, 1,067 labels written)

Read-only. No assignments modified.

---

## Counts by identity_source

| identity_source | Count | % | Layer |
|-----------------|------:|--:|-------|
| \`vdj\` | ${vdj} | ${pct(vdj, total)}% | VDJ-generated local identity |
| \`hot100\` | ${pureHot} | ${pct(pureHot, total)}% | Canonical chart song |
| \`hot100_vdj\` | ${dual} | ${pct(dual, total)}% | Chart song + VDJ media link |
| missing | ${bySource.missing ?? 0} | ${pct(bySource.missing ?? 0, total)}% | — |

**Canonical chart layer (\`hot100\` + \`hot100_vdj\`):** ${pureHot + dual} (${pct(pureHot + dual, total)}%)

---

## Wrong-layer: VDJ identity when chart canonical exists

Of **${vdjRows.length}** assignments to \`identity_source = vdj\`:

| Finding | Count | % of vdj-assigned |
|---------|------:|------------------:|
| Chart canonical exists (exact graph title match) | **${vdjWithCanonicalAlt}** | **${pct(vdjWithCanonicalAlt, vdjRows.length)}%** |
| Chart canonical exists (file base title, suffix stripped) | **${fileBaseConflicts}** | **${pct(fileBaseConflicts, vdjRows.length)}%** |
| **Total wrong-layer (union)** | **${vdjWithCanonicalAlt + fileBaseConflicts}** | **${pct(vdjWithCanonicalAlt + fileBaseConflicts, vdjRows.length)}%** |
| VDJ-only (no chart sibling found) | ${vdjRows.length - vdjWithCanonicalAlt - fileBaseConflicts} | ${pct(vdjRows.length - vdjWithCanonicalAlt - fileBaseConflicts, vdjRows.length)}% |
| Tier **A** wrong-layer (exact match bucket) | **${wrongLayerTierA.length}** | ${pct(wrongLayerTierA.length, vdjRows.length)}% |

Suffix variants (Color, BW, Extended) assigned to \`vdj\` rows whose graph title includes the suffix — canonical chart RVTR exists for the base song title from the filename.

${fileBaseExamples
  .slice(0, 8)
  .map(
    (c) =>
      `- **${c.fileArtist} — ${c.fileTitle}** → \`${c.assignedRvtr}\` (vdj: "${c.assignedGraphTitle}") · chart \`${c.canonicalRvtr}\` (${c.canonicalTitle}, #${c.canonicalPeak}) · tier ${c.tier}`,
  )
  .join("\n")}

---

## Artist/title inversions (filename vs graph)

**${inversions.length}** assignments where VDJ filename artist/title appears swapped vs assigned graph metadata.

---

## Root cause

\`loadMatchCandidates()\` queries \`canonical_track_display\` with **no \`identity_source\` filter**. Tier A exact match on normalized title+artist prefers rows whose titles **include VDJ filename suffixes** (Color, Extended, Live, BW, PO Edit) — typically \`identity_source = vdj\` rows minted from local files, not the Hot 100 canonical.

---

## Examples — VDJ assigned, chart canonical exists

${conflicts
  .slice(0, 15)
  .map(
    (c) =>
      `- **${c.fileArtist} — ${c.fileTitle}** → assigned \`${c.assignedRvtr}\` (vdj) · chart canonical \`${c.canonicalRvtr}\` (${c.canonicalTitle}, peak #${c.canonicalPeak}) · tier ${c.tier}`,
  )
  .join("\n")}

---

## Recommendation

Prefer \`identity_source IN ('hot100', 'hot100_vdj')\` in match ranking when a chart canonical exists for the same normalized artist+title. Deprioritize or exclude \`identity_source = vdj\` when a chart sibling exists.

---

## Outputs

- \`rvtr-identity-audit.json\`
- \`wrong-layer-conflicts.csv\`
`;

  const csvHeader =
    "fileArtist,fileTitle,assignedRvtr,assignedGraphTitle,canonicalRvtr,canonicalTitle,canonicalPeak,tier,score";
  const csvLines = conflicts.map((c) =>
    [
      c.fileArtist,
      c.fileTitle,
      c.assignedRvtr,
      c.assignedGraphTitle,
      c.canonicalRvtr,
      c.canonicalTitle,
      c.canonicalPeak,
      c.tier,
      c.score,
    ]
      .map((v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(","),
  );

  await Promise.all([
    writeFile(join(outDir, "RVTR-IDENTITY-AUDIT.md"), md, "utf8"),
    writeFile(
      join(outDir, "rvtr-identity-audit.json"),
      JSON.stringify({ summary, conflicts, fileBaseExamples, inversions, tierBySource }, null, 2),
      "utf8",
    ),
    writeFile(join(outDir, "wrong-layer-conflicts.csv"), [csvHeader, ...csvLines].join("\n"), "utf8"),
  ]);

  console.log("RVTR Identity Audit");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nWrote: ${join(outDir, "RVTR-IDENTITY-AUDIT.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
