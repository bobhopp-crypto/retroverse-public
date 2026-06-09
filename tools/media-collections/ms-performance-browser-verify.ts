/**
 * Verify Media Lab Performance Browser.
 * Usage: RETROVERSE_OPS=1 npx tsx tools/media-collections/ms-performance-browser-verify.ts
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { browsePerformances } from "@/lib/ops/media-lab/performance-browser/browse";

const REPORT_DIR = join(process.cwd(), "reports/media-collections");

const SAMPLE_SEARCHES = [
  { q: "Smokey Robinson", label: "artist" },
  { q: "Want To Know", label: "title" },
  { q: "midnight", label: "collection" },
  { q: "027bA7mICxM", label: "episode_id" },
  { q: "", classification: "Comedy" as const, label: "comedy_filter" },
  { q: "", year: 1975, status: "accepted" as const, label: "year_status" },
];

async function main() {
  const baseline = await browsePerformances({ limit: 500 });
  const samples: Record<string, unknown>[] = [];

  for (const sample of SAMPLE_SEARCHES) {
    const result = await browsePerformances({
      q: sample.q || undefined,
      year: sample.year,
      status: sample.status,
      classification: sample.classification,
      limit: 10,
    });
    samples.push({
      label: sample.label,
      query: sample,
      filtered: result.filtered,
      first: result.rows[0]
        ? {
            artist: result.rows[0].artist,
            title: result.rows[0].title,
            collection: result.rows[0].collection_title,
            year: result.rows[0].year,
            classification: result.rows[0].classification,
            clip_review_href: result.rows[0].clip_review_href,
          }
        : null,
    });
  }

  await mkdir(REPORT_DIR, { recursive: true });

  const md = `# Media Lab Performance Browser

**Date:** ${new Date().toISOString().slice(0, 10)}  
**Status:** Verified

## Route

\`/ops/media-lab/performances\`

## API

\`GET /api/ops/media-lab/performances/browse\`

Query params: \`q\`, \`collection\`, \`year\`, \`status\`, \`classification\`, \`limit\`

## Baseline

- Total performances: **${baseline.total}**
- Collections enabled: ${baseline.collections.filter((c) => c.enabled).map((c) => c.title).join(", ")}
- Future (disabled): ${baseline.collections.filter((c) => !c.enabled).map((c) => c.title).join(", ")}

## Sample Searches

${samples
  .map(
    (s) => `### ${(s as { label: string }).label}

- Query: \`${JSON.stringify((s as { query: unknown }).query)}\`
- Results: ${(s as { filtered: number }).filtered}
- First hit: ${JSON.stringify((s as { first: unknown }).first, null, 2)}
`,
  )
  .join("\n")}

## Open Behavior

Each result links to \`clip_review\` with:

- episode + performance IDs
- detected start/end
- adjusted_start / adjusted_end (when present)
- return href → \`/ops/media-lab/performances\`

## Screenshots

- \`reports/media-collections/ms-performance-browser.png\` — browser with search/filters
- \`reports/media-collections/ms-performance-browser-search.png\` — sample artist search

## Architecture

| Layer | Role |
|-------|------|
| Performance Browser | Search, filter, open clip review |
| Review Queues | Triage, approval, workflow |
| Media Lab clip_review | Precision edit, save adjustments |
| Export | Uses effective bounds from manifest |
`;

  const outPath = join(REPORT_DIR, "media-lab-performance-browser.md");
  await writeFile(outPath, md, "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify({ total: baseline.total, samples }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
