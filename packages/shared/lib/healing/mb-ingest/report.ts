import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { MB_CANARY_BATCH } from "@/lib/healing/mb-ingest/types";
import { loadStagedProposals } from "@/lib/healing/mb-ingest/stage";

function pct(n: number, t: number) {
  return t > 0 ? `${((n / t) * 100).toFixed(1)}%` : "0%";
}

export async function buildMbCanaryReport(generatedAt: string): Promise<string> {
  const proposals = await loadStagedProposals(MB_CANARY_BATCH);
  const rows = proposals
    .sort((a, b) => (b.chart_weeks ?? 0) - (a.chart_weeks ?? 0))
    .map(
      (p) =>
        `| ${p.proposal_id} | ${p.rvtr} | ${p.artist_name} | ${p.track_title} | ${p.proposed_album_title} | ${p.proposed_album_year ?? "—"} | ${p.proposed_track_position} | ${p.mb_release_id} | ${p.mb_release_group_id ?? "—"} | ${p.proposed_rval} | ${p.confidence} | ${p.qualify_reason ?? "—"} |`,
    )
    .join("\n");

  return `# MB-CANARY-25 — Staged Proposals

**Generated:** ${generatedAt}  
**Batch:** ${MB_CANARY_BATCH}  
**Mode:** Proposal-only — no canonical writes  
**Status:** staged (not applied)

---

## Summary

| Metric | Value |
|--------|------:|
| Proposals staged | ${proposals.length} |
| Target | 25 |
| Canonical tables touched | **none** |

---

## Proposals

| ID | RVTR | Artist | Track | Proposed album | Year | Pos | MB release | MB release group | Proposed RVAL | Confidence | Qualifies because |
|----|------|--------|-------|----------------|-----:|----:|------------|------------------|---------------|------------|---------------------|
${rows || "_No proposals staged. Run `npm run mb:canary:stage`._"}

---

## Safety gates (all passed)

- RVTR still missing album link
- No existing album for artist + title
- Proposed RVAL not in \`album_external_keys\`
- Track appears on proposed tracklist
- Studio-album shape (no compilation / live / remix / soundtrack)
- High confidence + auto-ingestable from Phase 5A pilot

---

## Next steps

1. Review this report and proposal rows in Postgres
2. Approve manually (future phase)
3. Apply only when \`RETROVERSE_MB_INGEST_APPLY=1\` (not enabled in 5D)

\`\`\`bash
npm run mb:canary:report
\`\`\`

---

## Artifacts

- JSON export: \`tools/out/mb-canary-25-proposals.json\`
- Audit log: \`RETROVERSE_DATA/ops/healing/mb-ingest-audit.jsonl\`
- Schema: \`tools/sql/mb_album_ingest_proposals_schema.sql\`
`;
}

export async function writeMbCanaryReport(): Promise<{
  reportPath: string;
  jsonPath: string;
  count: number;
}> {
  const generatedAt = new Date().toISOString();
  const proposals = await loadStagedProposals(MB_CANARY_BATCH);
  const report = await buildMbCanaryReport(generatedAt);

  const reportPath = join(process.cwd(), "reports/mb-canary-25-proposals.md");
  const outDir = join(process.cwd(), "tools/out");
  const jsonPath = join(outDir, "mb-canary-25-proposals.json");

  await mkdir(outDir, { recursive: true });
  await writeFile(reportPath, report);
  await writeFile(
    jsonPath,
    JSON.stringify({ generatedAt, batchName: MB_CANARY_BATCH, proposals }, null, 2),
  );

  return { reportPath, jsonPath, count: proposals.length };
}
