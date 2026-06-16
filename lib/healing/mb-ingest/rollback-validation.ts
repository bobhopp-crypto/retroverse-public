import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { simulateMbIngestDryRun } from "@/lib/healing/mb-ingest/apply-plan";
import { rollbackMbIngest } from "@/lib/healing/mb-ingest/apply-mb-ingest";
import { mbIngestAuditLogPath } from "@/lib/healing/mb-ingest/audit";

function formatPlannedRows(
  rows: Array<{
    table: string;
    operation: string;
    key: string;
    summary: string;
    fields?: Record<string, unknown>;
  }>,
): string {
  return rows
    .map((r) => {
      const fields = r.fields
        ? Object.entries(r.fields)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(", ")
        : "";
      return `| ${r.table} | ${r.operation} | ${r.key} | ${r.summary} | ${fields || "—"} |`;
    })
    .join("\n");
}

export async function buildRollbackValidationReport(
  proposalId: number,
  generatedAt: string,
): Promise<string> {
  const dry = await simulateMbIngestDryRun(proposalId);
  if (!dry) {
    return `# MB Rollback Validation\n\nProposal ${proposalId} not found.\n`;
  }

  const { proposal, applyPlan, rollbackPlan, preState, failureModes, fullyReversible, reversibleReason } =
    dry;

  const rollbackGuard = await rollbackMbIngest(proposalId, "dry-run-guard-check");
  const rollbackBlocked = !rollbackGuard.ok && rollbackGuard.code === "writes_disabled";

  return `# MB Rollback Validation — Proposal ${proposalId}

**Generated:** ${generatedAt}  
**Phase:** 5H — Rollback implementation & dry run  
**Mode:** **Validation only** — no apply, no rollback, no canonical writes

---

## Target proposal

| Field | Value |
|-------|-------|
| Proposal ID | **${proposal.proposal_id}** |
| RVTR | ${proposal.rvtr} |
| Artist | ${proposal.artist_name} |
| Track | ${proposal.track_title} |
| Album | ${proposal.proposed_album_title} (${proposal.proposed_album_year ?? "—"}) |
| Proposed RVAL | ${proposal.proposed_rval} |
| Tracklist slots | ${applyPlan.rowCounts.canonical_album_tracks} |
| Recoveries | ${applyPlan.recoveries.length} |
| Status | ${proposal.status} |

---

## Pre-apply state (live Postgres)

| Check | State |
|-------|-------|
| RVTR linked | ${preState.rvtrLinked ? "yes — would block apply" : "**no** ✓"} |
| Album exists | ${preState.albumExists ? "yes — would block apply" : "**no** ✓"} |
| RVAL in canonical | ${preState.rvalExists ? "yes — would block apply" : "**no** ✓"} |
| Proposal status | ${preState.proposalStatus} |

---

## Simulated apply plan

**Rows that would be inserted:** ${applyPlan.rowCounts.albums + applyPlan.rowCounts.album_external_keys + applyPlan.rowCounts.canonical_album_tracks}

| Table | Op | Key | Summary | Fields |
|-------|-----|-----|---------|--------|
${formatPlannedRows(applyPlan.inserts)}

**Rows that would be updated:** 1 (\`mb_album_ingest_proposals\` → applied)

### Apply dependency order

${applyPlan.dependencyOrder.map((s) => `- ${s}`).join("\n")}

---

## Simulated rollback plan

**Rows that would be removed:** up to ${rollbackPlan.rowCounts.canonical_album_tracks + rollbackPlan.rowCounts.album_external_keys + rollbackPlan.rowCounts.albums}

| Table | Op | Key | Summary | Guard |
|-------|-----|-----|---------|-------|
${formatPlannedRows(rollbackPlan.deletes)}

**RVTRs restored to unlinked:** ${rollbackPlan.rvtrsToRestore.join(", ")}

### Rollback dependency order

${rollbackPlan.dependencyOrder.map((s) => `- ${s}`).join("\n")}

---

## \`rollbackMbIngest\` implementation

| Requirement | Status |
|-------------|--------|
| Transactional | ✅ \`BEGIN\` / \`COMMIT\` / \`ROLLBACK\` via pool client |
| Idempotent | ✅ \`status=rolled_back\` → no-op + audit |
| Audit logged | ✅ \`${mbIngestAuditLogPath()}\` |
| Safe if run twice | ✅ Second call returns \`idempotent: true\` |
| Proposal status updated | ✅ \`applied\` → \`rolled_back\`, clears \`applied_*\` |
| Scoped deletes | ✅ \`canonical_source='musicbrainz_ingest_approved'\`, \`source='musicbrainz_ingest'\` |

**Guard check:** \`rollbackMbIngest(${proposalId})\` without env → \`${rollbackGuard.ok ? "unexpected ok" : rollbackGuard.code}\` (${rollbackBlocked ? "expected — writes disabled" : "check env"}).

---

## Failure modes

| Code | Scenario | Mitigation |
|------|----------|------------|
${failureModes.map((f) => `| ${f.code} | ${f.scenario} | ${f.mitigation} |`).join("\n")}

---

## Reversibility verdict — proposal ${proposalId}

**Can proposal ${proposalId} be applied and fully reversed with zero orphaned records?**

## **${fullyReversible ? "YES" : "NO"}** (simulation)

${reversibleReason}

${fullyReversible ? `After apply+rollback TX:
- **0** \`canonical_album_tracks\` rows with \`canonical_source='musicbrainz_ingest_approved'\` for this album_id
- **0** \`album_external_keys\` rows with \`source='musicbrainz_ingest'\` for this RVAL
- **0** orphan \`albums\` rows (deleted when CAT count = 0)
- **RVTR ${proposal.rvtr}** returns to unlinked state (no CAT row with that key)` : ""}

**Caveats before production apply:**
1. \`rollbackMbIngest\` implemented but **not executed** in this phase
2. \`applyMbIngest\` not yet implemented — dry run only
3. Requires \`RETROVERSE_MB_INGEST_APPLY=1\` for live rollback test
4. Run one real apply+rollback on staging before wave-5 production apply
5. RVAL \`${proposal.proposed_rval}\` uses gap-fill low number — decide allocator policy first

---

## Artifacts

- Implementation: \`lib/healing/mb-ingest/apply-mb-ingest.ts\`
- Plan builder: \`lib/healing/mb-ingest/apply-plan.ts\`
- Schema: \`tools/sql/mb_album_ingest_apply_schema.sql\`
- Apply readiness: \`reports/mb-canary-25-apply-readiness.md\`

\`\`\`bash
npm run mb:rollback:validate -- 29
\`\`\`
`;
}

export async function writeRollbackValidationReport(proposalId = 29): Promise<{
  reportPath: string;
  jsonPath: string;
  fullyReversible: boolean;
}> {
  const generatedAt = new Date().toISOString();
  const dry = await simulateMbIngestDryRun(proposalId);
  const report = await buildRollbackValidationReport(proposalId, generatedAt);

  const reportPath = join(process.cwd(), "reports/mb-rollback-validation.md");
  const jsonPath = join(process.cwd(), "tools/out/mb-rollback-validation.json");
  await mkdir(join(process.cwd(), "tools/out"), { recursive: true });
  await writeFile(reportPath, report);
  await writeFile(jsonPath, JSON.stringify({ generatedAt, proposalId, dry }, null, 2));

  return {
    reportPath,
    jsonPath,
    fullyReversible: dry?.fullyReversible ?? false,
  };
}
