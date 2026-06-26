/**
 * Match Agent Phase 3A — candidate loader audit report.
 * Usage: npm run ops:match-agent-phase-3-audit
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadMatchCandidates } from "../lib/sunday-nights/match-candidates";
import { matchSimilarityScore } from "../lib/ops/browser-plus/browser-plus-artist-match";

const EXAMPLES = [
  {
    label: "Elton John — Goodbye Yellow Brick Road (Muppet Show 1977)",
    artist: "Elton John",
    title: "Goodbye Yellow Brick Road(Muppet Show 1977)",
    vdjRvtr: "RVTR852528",
    canonicalRvtr: "RVTR483649",
  },
  {
    label: "Killers — Mr. Brightside",
    artist: "Killers",
    title: "Mr. Brightside",
    vdjRvtr: "RVTR843135",
    canonicalRvtr: "RVTR989769",
  },
  {
    label: "The Animals — Please Don't Let Me Be Misunderstood (Color)",
    artist: "The Animals",
    title: "Please Don't Let Me Be Misunderstood  (Color)",
    vdjRvtr: "RVTR619129",
    canonicalRvtr: "RVTR147877",
  },
];

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/match-agent-phase-3");
  await mkdir(outDir, { recursive: true });

  const { inspectQuery } = await import("../lib/inspect/pg");
  const exampleBlocks: string[] = [];

  for (const ex of EXAMPLES) {
    const candidates = await loadMatchCandidates(ex.artist, ex.title, 8);
    const meta = await inspectQuery<{
      rvtr: string;
      identity_source: string | null;
      canonical_title: string;
      peak_hot100_position: number | null;
    }>(
      `
      SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
             identity_source, canonical_title, peak_hot100_position
      FROM canonical_track_display
      WHERE upper(trim(coalesce(retroverse_track_id, track_id))) = ANY($1::text[])
      `,
      [[ex.vdjRvtr, ex.canonicalRvtr]],
    );
    const metaByRvtr = new Map(meta.map((m) => [m.rvtr, m]));

    const rows = candidates.map((c, index) => {
      const titleScore = matchSimilarityScore(ex.title, c.title);
      return {
        rank: index + 1,
        rvtr: c.rvtr,
        identitySource: c.identitySource ?? metaByRvtr.get(c.rvtr)?.identity_source ?? "?",
        title: c.title,
        tier: c.tier,
        titleScore,
        peak: c.peakHot100,
      };
    });

    exampleBlocks.push(`### ${ex.label}

| Rank | RVTR | identity_source | Tier | titleScore | Peak |
|-----:|------|-----------------|------|----------:|-----:|
${rows
  .map(
    (r) =>
      `| ${r.rank} | \`${r.rvtr}\` | ${r.identitySource} | ${r.tier} | ${r.titleScore} | ${r.peak ?? "—"} |`,
  )
  .join("\n")}

- VDJ sibling: \`${ex.vdjRvtr}\` (${metaByRvtr.get(ex.vdjRvtr)?.identity_source})
- Chart canonical: \`${ex.canonicalRvtr}\` (${metaByRvtr.get(ex.canonicalRvtr)?.identity_source}, peak #${metaByRvtr.get(ex.canonicalRvtr)?.peak_hot100_position ?? "—"})
- **Top pick after Phase 3B:** \`${rows[0]?.rvtr ?? "—"}\` (${rows[0]?.identitySource})
`);
  }

  const md = `# Match Agent Phase 3A — Candidate Loader Audit

Read-only audit of \`loadMatchCandidates()\` and downstream ranking.

---

## Findings

### 1. \`identity_source\` was ignored in SQL

\`SELECT_DISPLAY\` pulled from \`canonical_track_display\` without selecting or ordering on \`identity_source\`.
All tiers returned \`hot100\`, \`hot100_vdj\`, and \`vdj\` rows into the same pool.

**Location:** \`lib/sunday-nights/match-candidates.ts\` — \`ORDER_DISPLAY\` previously sorted only by \`has_hot100\`, peak, and title alphabetically.

### 2. Tier A prefers filename-shaped titles

\`tierExactNormalized()\` matches when:

- \`canonical_title ILIKE\` full filename title (including suffixes)
- OR compact key equals filename compact key

VDJ rows minted from local files embed suffix tokens (**Color**, **Extended**, **Muppet Show 1977**, **Promo Only**) in \`canonical_title\`. Those rows score **100** title similarity against the filename. Chart canonical titles do not include suffixes, so they often **fail Tier A entirely**.

### 3. Queue ranking was score-only

\`resolveQueueItem()\` in \`match-queue.ts\` sorted candidates by \`combinedMatchScore\` only.
Higher title similarity to the **filename** (not the canonical song title) always won — even when a Hot 100 sibling existed.

### 4. Candidate cap hid canonical siblings

Match queue loaded only **5** candidates. When Tier A filled the pool with VDJ variants, chart canonicals discovered in later tiers never surfaced.

---

## Why VDJ rows outranked canonical siblings

| Mechanism | Effect |
|-----------|--------|
| Tier A ILIKE on full filename title | VDJ row matches; chart row often does not |
| Title similarity scoring | VDJ title ≈ filename → 100 score |
| No identity_source ordering | VDJ and chart rows treated equally when both match |
| Score-only sort in queue | Highest filename similarity wins |

---

## Post-fix behavior (Phase 3B)

1. New first tier: **canonical base title + artist** (\`hot100\` / \`hot100_vdj\` only)
2. SQL \`ORDER BY\` prefers \`hot100\` / \`hot100_vdj\` before \`vdj\`; shorter titles before longer
3. Loader re-sorts by identity tier before returning
4. Queue sorts by: identity tier → match tier → artist → title → year proximity

---

## Live examples (after Phase 3B)

${exampleBlocks.join("\n")}

---

## Outputs

- \`reports/match-agent-phase-3/CANDIDATE-LOADER-AUDIT.md\` (this file)
- \`reports/match-agent-phase-3/conflict-reassignment.csv\`
- \`reports/match-agent-phase-3/VALIDATION.md\`
`;

  await writeFile(join(outDir, "CANDIDATE-LOADER-AUDIT.md"), md, "utf8");
  console.log(`Wrote: ${join(outDir, "CANDIDATE-LOADER-AUDIT.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
