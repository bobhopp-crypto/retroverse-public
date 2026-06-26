/**
 * Match Agent Phase 3 — sample validation (canonical-first ranking).
 * Usage: npm run ops:match-agent-phase-3-validate
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveQueueItem } from "../lib/ops/browser-plus/match-queue";

const SAMPLES = [
  {
    id: "elton-goodbye",
    artist: "Elton John",
    title: "Goodbye Yellow Brick Road(Muppet Show 1977)",
    filePath: "/Users/bobhopp/DJ MEDIA/VIDEO/1970's/Elton John - Goodbye Yellow Brick Road(Muppet Show 1977).mp4",
    expectRvtrPrefix: "RVTR483649",
    expectIdentity: "hot100",
    expectTitleIncludes: "Goodbye Yellow Brick Road",
  },
  {
    id: "killers-brightside",
    artist: "Killers",
    title: "Mr. Brightside",
    filePath: "/Users/bobhopp/DJ MEDIA/VIDEO/2000's/Killers - Mr. Brightside.mp4",
    expectRvtrPrefix: "RVTR989769",
    expectIdentity: "hot100",
    expectTitleIncludes: "Mr Brightside",
  },
  {
    id: "animals-misunderstood",
    artist: "The Animals",
    title: "Please Don't Let Me Be Misunderstood  (Color)",
    filePath: "/Users/bobhopp/DJ MEDIA/VIDEO/1960's/The Animals - Please Don't Let Me Be Misunderstood (Color).mp4",
    expectRvtrPrefix: "RVTR147877",
    expectIdentity: "hot100",
    expectTitleIncludes: "Misunderstood",
  },
  {
    id: "britney-hold-it",
    artist: "Britney Spears",
    title: "Hold It Against Me (Promo Only No Break Edit*)",
    filePath: "/Users/bobhopp/DJ MEDIA/VIDEO/2010's/Britney Spears - Hold It Against Me (Promo Only No Break Edit*).mp4",
    expectRvtrPrefix: "RVTR946203",
    expectIdentity: "hot100",
    expectTitleIncludes: "Hold It Against Me",
  },
];

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/match-agent-phase-3");
  await mkdir(outDir, { recursive: true });

  const { inspectQuery } = await import("../lib/inspect/pg");
  const packageStatusByRvtr = new Map<string, string>();
  const results: Array<Record<string, unknown>> = [];

  for (const sample of SAMPLES) {
    const item = await resolveQueueItem({
      rowId: sample.id,
      filePath: sample.filePath,
      artist: sample.artist,
      title: sample.title,
      packageStatusByRvtr,
    });

    const topRvtr = item.top?.rvtr ?? "";
    const meta = topRvtr
      ? await inspectQuery<{ identity_source: string | null; canonical_title: string }>(
          `
          SELECT identity_source, canonical_title
          FROM canonical_track_display
          WHERE upper(trim(coalesce(retroverse_track_id, track_id))) = $1
          LIMIT 1
          `,
          [topRvtr.toUpperCase()],
        )
      : [];

    const identity = meta[0]?.identity_source ?? null;
    const graphTitle = meta[0]?.canonical_title ?? item.top?.title ?? "";
    const rvtrPass = topRvtr.toUpperCase() === sample.expectRvtrPrefix.toUpperCase();
    const identityPass = identity === sample.expectIdentity || identity === "hot100_vdj";
    const titlePass = graphTitle.toLowerCase().includes(sample.expectTitleIncludes.toLowerCase());

    results.push({
      id: sample.id,
      artist: sample.artist,
      title: sample.title,
      topRvtr,
      identitySource: identity,
      graphTitle,
      matchTier: item.matchTier,
      combinedScore: item.combinedScore,
      alternatives: item.alternatives.map((alt) => ({
        rvtr: alt.rvtr,
        title: alt.title,
        score: alt.matchScore,
      })),
      pass: rvtrPass && identityPass && titlePass,
      checks: { rvtrPass, identityPass, titlePass },
    });
  }

  const passCount = results.filter((row) => row.pass).length;
  const md = `# Match Agent Phase 3 — Sample Validation

**Run:** ${new Date().toISOString()}  
**Passed:** ${passCount}/${results.length}

| Sample | Top RVTR | identity_source | Tier | Score | Pass |
|--------|----------|-----------------|------|------:|------|
${results
  .map(
    (row) =>
      `| ${row.id} | ${row.topRvtr} | ${row.identitySource} | ${row.matchTier} | ${row.combinedScore} | ${row.pass ? "✓" : "✗"} |`,
  )
  .join("\n")}

## Details

${results
  .map(
    (row) => `### ${row.id}

- File: ${row.artist} — ${row.title}
- Top: \`${row.topRvtr}\` (${row.identitySource}) — ${row.graphTitle}
- Alternatives: ${JSON.stringify(row.alternatives)}
- Checks: ${JSON.stringify(row.checks)}
`,
  )
  .join("\n")}
`;

  await writeFile(join(outDir, "VALIDATION.md"), md, "utf8");
  await writeFile(join(outDir, "validation.json"), JSON.stringify(results, null, 2), "utf8");

  console.log(`Validation: ${passCount}/${results.length} passed`);
  for (const row of results) {
    console.log(
      `${row.pass ? "PASS" : "FAIL"} ${row.id}: ${row.topRvtr} (${row.identitySource}) tier=${row.matchTier}`,
    );
  }

  if (passCount < results.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
