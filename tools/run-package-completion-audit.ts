/**
 * Package Completion Audit — 789 review packages without story cards.
 * Usage: npm run ops:package-completion-audit
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function mdTable(rows: Array<{ label: string; count: number; pct?: number }>): string {
  const lines = ["| Category | Count | % |", "|----------|------:|--:|"];
  for (const row of rows) {
    lines.push(`| ${row.label} | ${row.count.toLocaleString()} | ${row.pct ?? "—"}% |`);
  }
  return lines.join("\n");
}

async function main() {
  const { auditPackageCompletion } = await import("../lib/ops/package-completion-audit");
  const audit = await auditPackageCompletion();
  const outDir = join(import.meta.dirname, "..", "reports", "package-priority-audit");
  await mkdir(outDir, { recursive: true });

  const report = `# Package Completion Audit

**Scanned:** ${audit.scannedAt}
**Focus:** ${audit.reviewNoCards.toLocaleString()} owned-cohort packages in \`review\` with **zero story cards**

---

## Why they stopped at \`review\`

\`processSong()\` **intentionally ends at \`review\`** without building cards:

> "Ready for human review — build cards after approving facts/stories"

Card assembly is a **separate step** (\`buildCardsFromReview\` / \`finalizeAndPublish\`). The overnight backfill also **skips** packages already in \`review\` on resume — so most never received card assembly.

---

## Failure / stall categories (789 packages)

${mdTable(audit.reasonCounts.map((r) => ({ label: r.label, count: r.count, pct: r.pct })))}

---

## Effort tiers to reach \`cards_ready\`

| Tier | Count | Effort | Action |
|------|------:|--------|--------|
| **1 — Card assembly only** | ${audit.effortEstimate.tier1_card_assembly_only.count.toLocaleString()} | ${audit.effortEstimate.tier1_card_assembly_only.effort} | \`buildCardsFromReview\` batch |
| **2 — Story approval gap** | ${audit.effortEstimate.tier2_auto_approve_stories.count.toLocaleString()} | ${audit.effortEstimate.tier2_auto_approve_stories.effort} | Lower auto-approve threshold or batch-approve top stories |
| **3 — Fact gap** | ${audit.effortEstimate.tier3_fact_promotion_or_reextract.count.toLocaleString()} | ${audit.effortEstimate.tier3_fact_promotion_or_reextract.effort} | Promote facts or re-run extraction |
| **4 — Draft (failed process)** | ${audit.effortEstimate.tier4_draft_reprocess.count.toLocaleString()} | ${audit.effortEstimate.tier4_draft_reprocess.effort} | Re-run \`processSong\` |
| **5 — Empty / broken** | ${audit.effortEstimate.tier5_empty_or_broken.count.toLocaleString()} | ${audit.effortEstimate.tier5_empty_or_broken.effort} | Full pipeline re-run |

---

## Fastest path: 1,184 package files → intelligence packages

| Current state | Count |
|---------------|------:|
| Already intelligence (\`cards_ready\` / \`published\` / has cards) | ${audit.alreadyIntelligence.toLocaleString()} |
| \`review\` + ready for card assembly | ${audit.readyForCardAssembly.toLocaleString()} |
| \`review\` + needs story/fact fix (Tier 2–3) | ${(audit.reviewNoCards - audit.readyForCardAssembly).toLocaleString()} |
| \`draft\` (process failed) | ${audit.draftNoCards.toLocaleString()} |

**After Tier-1 card assembly only:** ${audit.full1184Path.projectedIntelligenceAfterCardAssembly.toLocaleString()} intelligence packages (+${audit.readyForCardAssembly.toLocaleString()} from current ${audit.alreadyIntelligence.toLocaleString()})

No new Ollama generation required for Tier 1.

---

## Recommended sequence (no new songs)

1. **Batch \`buildCardsFromReview\`** on ${audit.readyForCardAssembly.toLocaleString()} ready packages (~${Math.round(audit.readyForCardAssembly * 2 / 60)} min)
2. **Batch story auto-approve** rule relaxation for Tier 2 (${audit.effortEstimate.tier2_auto_approve_stories.count.toLocaleString()} pkgs)
3. **Fact promotion pass** on Tier 3 before card assembly
4. **Re-process** ${audit.draftNoCards.toLocaleString()} drafts only (not the 789 review cohort)
5. Leave Tier 5 for manual triage

---

## Outputs

- \`completion-audit.json\`
- \`review-no-cards.csv\`
`;

  const csvHeader =
    "rvtr,artist,title,playCount,reason,approvedFacts,approvedStories,candidateFacts,candidateStories,researchSources,canBuildCardsReason";
  const csvLines = audit.rows.map((row) =>
    [
      row.rvtr,
      row.artist,
      row.title,
      row.playCount,
      row.reason,
      row.approvedFacts,
      row.approvedStories,
      row.candidateFacts,
      row.candidateStories,
      row.researchSources,
      row.canBuildCardsReason ?? "",
    ]
      .map((v) => {
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(","),
  );

  await Promise.all([
    writeFile(join(outDir, "COMPLETION-AUDIT.md"), report, "utf8"),
    writeFile(join(outDir, "completion-audit.json"), JSON.stringify(audit, null, 2), "utf8"),
    writeFile(join(outDir, "review-no-cards.csv"), [csvHeader, ...csvLines].join("\n"), "utf8"),
  ]);

  console.log("Package Completion Audit");
  console.log(`  Review, no cards: ${audit.reviewNoCards}`);
  console.log(`  Ready for card assembly: ${audit.readyForCardAssembly}`);
  for (const r of audit.reasonCounts.slice(0, 6)) {
    console.log(`  ${r.label}: ${r.count} (${r.pct}%)`);
  }
  console.log(`\nWrote: ${join(outDir, "COMPLETION-AUDIT.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
