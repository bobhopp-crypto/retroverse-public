import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  applyMbIngest,
  rollbackMbIngest,
} from "@/lib/healing/mb-ingest/apply-mb-ingest";
import { ensureMbIngestApplySchema, loadMbIngestProposal } from "@/lib/healing/mb-ingest/apply-plan";
import { MB_INGEST_AEK_SOURCE, MB_INGEST_CAT_SOURCE } from "@/lib/healing/mb-ingest/apply-plan";
import { mbIngestApplyEnabled } from "@/lib/healing/mb-ingest/apply-guard";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { inspectQuery } from "@/lib/inspect/pg";

const PROPOSAL_ID = 29;
const RVTR = "RVTR724910";
const ACTOR = "mb-proposal-29-test";

export type VerificationSnapshot = {
  label: string;
  proposalStatus: string | null;
  albumExists: boolean;
  albumId: number | null;
  rvalExists: boolean;
  rval: string | null;
  catIngestCount: number;
  rvtrLinked: boolean;
  rvtrAlbumTitle: string | null;
  trackPageAlbumCount: number;
};

export type ApplyRollbackTestResult = {
  proposalId: number;
  applyResult: Awaited<ReturnType<typeof applyMbIngest>>;
  applyVerify: VerificationSnapshot;
  rollbackResult: Awaited<ReturnType<typeof rollbackMbIngest>>;
  rollbackVerify: VerificationSnapshot;
  rollbackSecond: Awaited<ReturnType<typeof rollbackMbIngest>>;
  finalVerify: VerificationSnapshot;
  errors: string[];
  passed: boolean;
};

async function snapshot(label: string, albumId?: number | null): Promise<VerificationSnapshot> {
  const proposal = await loadMbIngestProposal(PROPOSAL_ID);
  const rval = proposal?.applied_rval ?? proposal?.proposed_rval ?? null;
  const targetAlbumId = albumId ?? proposal?.applied_album_id ?? null;

  const [rvtrLinked, album, rvalRow, catCount, trackPage] = await Promise.all([
    inspectQuery<{ rvtr: string }>(
      `SELECT upper(trim(canonical_track_key)) AS rvtr FROM canonical_album_tracks WHERE upper(trim(canonical_track_key))=$1 LIMIT 1`,
      [RVTR],
    ),
    targetAlbumId
      ? inspectQuery<{ id: number; title: string }>(
          `SELECT id, title FROM albums WHERE id=$1 LIMIT 1`,
          [targetAlbumId],
        )
      : Promise.resolve([]),
    rval
      ? inspectQuery<{ external_key: string; source: string }>(
          `SELECT external_key, source FROM album_external_keys WHERE upper(trim(external_key))=$1 LIMIT 1`,
          [rval],
        )
      : Promise.resolve([]),
    targetAlbumId
      ? inspectQuery<{ c: number }>(
          `
          SELECT count(*)::int AS c FROM canonical_album_tracks
          WHERE album_id=$1 AND canonical_source=$2
          `,
          [targetAlbumId, MB_INGEST_CAT_SOURCE],
        )
      : Promise.resolve([{ c: 0 }]),
    loadTrackPage(RVTR),
  ]);

  return {
    label,
    proposalStatus: proposal?.status ?? null,
    albumExists: album.length > 0,
    albumId: album[0]?.id ?? null,
    rvalExists: rvalRow.length > 0,
    rval: rvalRow[0]?.external_key ?? null,
    catIngestCount: catCount[0]?.c ?? 0,
    rvtrLinked: rvtrLinked.length > 0,
    rvtrAlbumTitle: rvtrLinked.length > 0 ? (album[0]?.title ?? trackPage?.albums[0]?.title ?? null) : null,
    trackPageAlbumCount: trackPage?.albums.length ?? 0,
  };
}

export async function runProposal29ApplyRollbackTest(): Promise<ApplyRollbackTestResult> {
  const errors: string[] = [];

  if (!mbIngestApplyEnabled()) {
    errors.push("RETROVERSE_MB_INGEST_APPLY=1 not set");
    return {
      proposalId: PROPOSAL_ID,
      applyResult: { ok: false, code: "writes_disabled", message: "env not set" },
      applyVerify: await snapshot("apply-skipped"),
      rollbackResult: { ok: false, code: "skipped", message: "apply skipped" },
      rollbackVerify: await snapshot("rollback-skipped"),
      rollbackSecond: { ok: false, code: "skipped", message: "apply skipped" },
      finalVerify: await snapshot("final-skipped"),
      errors,
      passed: false,
    };
  }

  await ensureMbIngestApplySchema();

  const pre = await loadMbIngestProposal(PROPOSAL_ID);
  if (!pre) errors.push("Proposal 29 not found");
  if (pre && pre.status === "applied") {
    errors.push("Proposal 29 already applied — run rollback first or use clean staging");
  }

  const applyResult = await applyMbIngest(PROPOSAL_ID, ACTOR);
  if (!applyResult.ok) errors.push(`Apply failed: ${applyResult.message}`);

  const applyVerify = await snapshot("post-apply", applyResult.ok ? applyResult.albumId : null);
  if (applyResult.ok) {
    if (!applyVerify.albumExists) errors.push("Post-apply: album row missing");
    if (!applyVerify.rvalExists) errors.push("Post-apply: RVAL missing");
    if (applyVerify.catIngestCount !== 16) {
      errors.push(`Post-apply: expected 16 CAT rows, got ${applyVerify.catIngestCount}`);
    }
    if (!applyVerify.rvtrLinked) errors.push("Post-apply: RVTR724910 not linked");
    if (applyVerify.trackPageAlbumCount < 1) {
      errors.push("Post-apply: /track/RVTR724910 does not resolve album");
    }
    if (applyVerify.proposalStatus !== "applied") {
      errors.push(`Post-apply: proposal status ${applyVerify.proposalStatus}`);
    }
  }

  const rollbackResult = await rollbackMbIngest(PROPOSAL_ID, ACTOR);
  if (!rollbackResult.ok) errors.push(`Rollback failed: ${rollbackResult.message}`);

  const rollbackVerify = await snapshot("post-rollback");
  if (rollbackResult.ok && !rollbackResult.idempotent) {
    if (rollbackVerify.albumExists) errors.push("Post-rollback: album still exists");
    if (rollbackVerify.rvalExists) errors.push("Post-rollback: RVAL still exists");
    if (rollbackVerify.catIngestCount > 0) errors.push("Post-rollback: ingest CAT rows remain");
    if (rollbackVerify.rvtrLinked) errors.push("Post-rollback: RVTR724910 still linked");
    if (rollbackVerify.trackPageAlbumCount > 0) {
      errors.push("Post-rollback: track page still shows album");
    }
    if (rollbackVerify.proposalStatus !== "rolled_back") {
      errors.push(`Post-rollback: proposal status ${rollbackVerify.proposalStatus}`);
    }
    if (rollbackResult.deletedCat !== 16) {
      errors.push(`Post-rollback: deleted ${rollbackResult.deletedCat} CAT rows, expected 16`);
    }
  }

  const rollbackSecond = await rollbackMbIngest(PROPOSAL_ID, ACTOR);
  if (!rollbackSecond.ok) errors.push(`Second rollback failed: ${rollbackSecond.message}`);
  if (rollbackSecond.ok && !rollbackSecond.idempotent) {
    errors.push("Second rollback should be idempotent no-op");
  }

  const finalVerify = await snapshot("final");

  return {
    proposalId: PROPOSAL_ID,
    applyResult,
    applyVerify,
    rollbackResult,
    rollbackVerify,
    rollbackSecond,
    finalVerify,
    errors,
    passed: errors.length === 0,
  };
}

function fmtSnap(s: VerificationSnapshot): string {
  return `| ${s.label} | ${s.proposalStatus ?? "—"} | ${s.albumExists ? s.albumId : "—"} | ${s.rvalExists ? s.rval : "—"} | ${s.catIngestCount} | ${s.rvtrLinked ? "yes" : "no"} | ${s.trackPageAlbumCount} | ${s.rvtrAlbumTitle ?? "—"} |`;
}

export async function writeProposal29TestReport(
  result: ApplyRollbackTestResult,
): Promise<string> {
  const generatedAt = new Date().toISOString();
  const report = `# MB Proposal 29 — Apply/Rollback Live Test

**Generated:** ${generatedAt}  
**Phase:** 5I — Single live apply/rollback test  
**Proposal:** 29 only (Zach Bryan — RVTR724910)  
**Result:** ${result.passed ? "**PASSED**" : "**FAILED**"}

---

## Commands run

\`\`\`bash
RETROVERSE_MB_INGEST_APPLY=1 npm run mb:proposal-29:test
\`\`\`

---

## Files changed (implementation)

| File | Change |
|------|--------|
| \`lib/healing/mb-ingest/apply-mb-ingest.ts\` | Added \`applyMbIngest(proposalId)\` |
| \`lib/healing/mb-ingest/apply-plan.ts\` | Load \`confidence\` for apply scoring |
| \`tools/healing/mb-proposal-29-test.ts\` | Live test CLI (proposal 29 only) |
| \`lib/healing/mb-ingest/proposal-29-test.ts\` | Test runner + verification snapshots |
| \`package.json\` | \`mb:proposal-29:test\` script |

---

## Apply result

\`\`\`json
${JSON.stringify(result.applyResult, null, 2)}
\`\`\`

### Apply verification

| Phase | Proposal status | Album ID | RVAL | CAT ingest | RVTR linked | Track page albums | Album title |
|-------|-----------------|----------|------|------------|---------------|-------------------|-------------|
${fmtSnap(result.applyVerify)}

---

## Rollback result (first)

\`\`\`json
${JSON.stringify(result.rollbackResult, null, 2)}
\`\`\`

### Rollback verification

| Phase | Proposal status | Album ID | RVAL | CAT ingest | RVTR linked | Track page albums | Album title |
|-------|-----------------|----------|------|------------|---------------|-------------------|-------------|
${fmtSnap(result.rollbackVerify)}

---

## Rollback idempotency (second call)

\`\`\`json
${JSON.stringify(result.rollbackSecond, null, 2)}
\`\`\`

---

## Final DB state

| Phase | Proposal status | Album ID | RVAL | CAT ingest | RVTR linked | Track page albums | Album title |
|-------|-----------------|----------|------|------------|---------------|-------------------|-------------|
${fmtSnap(result.finalVerify)}

**Expected final state:** \`rolled_back\` · no album · no RVAL · 0 ingest CAT · RVTR unlinked

---

## Errors

${result.errors.length === 0 ? "_None_" : result.errors.map((e) => `- ${e}`).join("\n")}

---

## Verdict

**Can proposal 29 be applied and fully reversed with zero orphaned records?**

**${result.passed ? "YES — live test passed" : "NO — see errors"}**

Proposal 29 is **${result.finalVerify.proposalStatus === "rolled_back" ? "not left applied" : "NOT in expected rolled_back state"}** after test.
`;

  const reportPath = join(process.cwd(), "reports/mb-proposal-29-apply-rollback-test.md");
  await writeFile(reportPath, report);
  return reportPath;
}
