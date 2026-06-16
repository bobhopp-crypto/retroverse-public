import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadAlbumPage } from "@/lib/album/load-album-page";
import { verifyCoverPromotedByRval } from "@/lib/covers/backfill/verify-rval";
import { headCdnUrl, headR2Object } from "@/lib/covers/backfill/publish-r2";
import {
  loadMbIngestProposal,
  MB_INGEST_AEK_SOURCE,
  MB_INGEST_CAT_SOURCE,
} from "@/lib/healing/mb-ingest/apply-plan";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { inspectQuery } from "@/lib/inspect/pg";

export type PipelineVerifyRow = {
  proposalId: number;
  rvtr: string;
  rval: string;
  albumTitle: string;
  albumCreated: boolean;
  rvtrLinked: boolean;
  coverAcquired: boolean;
  r2Published: boolean;
  cdn200: boolean;
  publicArtwork: boolean;
  coverUrl: string | null;
  pass: boolean;
  errors: string[];
};

export type PipelineVerifyResult = {
  generatedAt: string;
  proposalIds: number[];
  rows: PipelineVerifyRow[];
  summary: {
    total: number;
    fullPass: number;
    albumOnly: number;
    coverComplete: number;
    failures: number;
  };
  readyForWave50: boolean;
};

async function verifyOne(proposalId: number): Promise<PipelineVerifyRow> {
  const proposal = await loadMbIngestProposal(proposalId);
  const errors: string[] = [];
  if (!proposal || proposal.status !== "applied" || !proposal.applied_album_id) {
    return {
      proposalId,
      rvtr: proposal?.rvtr ?? "—",
      rval: proposal?.applied_rval ?? proposal?.proposed_rval ?? "—",
      albumTitle: proposal?.proposed_album_title ?? "—",
      albumCreated: false,
      rvtrLinked: false,
      coverAcquired: false,
      r2Published: false,
      cdn200: false,
      publicArtwork: false,
      coverUrl: null,
      pass: false,
      errors: [proposal ? `status ${proposal.status}` : "proposal missing"],
    };
  }

  const rval = (proposal.applied_rval ?? proposal.proposed_rval).trim().toUpperCase();
  const rvtrs =
    proposal.track_recoveries_json.length > 0
      ? proposal.track_recoveries_json.map((r) => r.rvtr.trim().toUpperCase())
      : [proposal.rvtr.trim().toUpperCase()];

  const [album, aek, rvtrChecks] = await Promise.all([
    inspectQuery<{ id: number }>(`SELECT id FROM albums WHERE id=$1 LIMIT 1`, [
      proposal.applied_album_id,
    ]),
    inspectQuery<{ external_key: string }>(
      `SELECT external_key FROM album_external_keys WHERE upper(trim(external_key))=$1 AND source=$2 LIMIT 1`,
      [rval, MB_INGEST_AEK_SOURCE],
    ),
    ...rvtrs.map((rvtr) =>
      inspectQuery<{ rvtr: string }>(
        `SELECT 1 AS rvtr FROM canonical_album_tracks WHERE upper(trim(canonical_track_key))=$1 AND canonical_source=$2 LIMIT 1`,
        [rvtr, MB_INGEST_CAT_SOURCE],
      ),
    ),
  ]);

  const albumCreated = Boolean(album[0] && aek[0]);
  const rvtrLinked = rvtrChecks.every((r) => r.length > 0);
  if (!albumCreated) errors.push("album/RVAL missing");
  if (!rvtrLinked) errors.push("RVTR not linked");

  const coverVerify = await verifyCoverPromotedByRval(rval);
  const coverAcquired = coverVerify.ok;
  if (!coverAcquired) errors.push("cover not promoted");

  let r2Published = false;
  let cdn200 = false;
  let publicArtwork = false;
  let coverUrl: string | null = null;

  if (coverVerify.canonicalCoverPath) {
    r2Published = await headR2Object(coverVerify.canonicalCoverPath);
    if (!r2Published) errors.push("R2 head failed");
  }

  const albumPage = await loadAlbumPage(rval);
  coverUrl = albumPage?.coverUrl ?? null;
  publicArtwork = Boolean(coverUrl);
  if (!publicArtwork) errors.push("public page no artwork");

  if (coverUrl) {
    const status = await headCdnUrl(coverUrl);
    cdn200 = status === 200;
    if (!cdn200) errors.push(`CDN ${status}`);
  } else {
    errors.push("no coverUrl");
  }

  const trackPage = await loadTrackPage(rvtrs[0]!);
  if ((trackPage?.albums.length ?? 0) < 1) errors.push("track album module empty");

  const pass =
    albumCreated &&
    rvtrLinked &&
    coverAcquired &&
    r2Published &&
    cdn200 &&
    publicArtwork;

  return {
    proposalId,
    rvtr: proposal.rvtr,
    rval,
    albumTitle: proposal.proposed_album_title,
    albumCreated,
    rvtrLinked,
    coverAcquired,
    r2Published,
    cdn200,
    publicArtwork,
    coverUrl,
    pass,
    errors,
  };
}

export async function runPipelineVerify(
  proposalIds: readonly number[],
): Promise<PipelineVerifyResult> {
  const rows: PipelineVerifyRow[] = [];
  for (const id of proposalIds) {
    rows.push(await verifyOne(id));
  }
  const fullPass = rows.filter((r) => r.pass).length;
  const coverComplete = rows.filter(
    (r) => r.coverAcquired && r.r2Published && r.cdn200 && r.publicArtwork,
  ).length;
  return {
    generatedAt: new Date().toISOString(),
    proposalIds: [...proposalIds],
    rows,
    summary: {
      total: rows.length,
      fullPass,
      albumOnly: rows.filter((r) => r.albumCreated && r.rvtrLinked && !r.pass).length,
      coverComplete,
      failures: rows.filter((r) => !r.albumCreated || !r.rvtrLinked).length,
    },
    readyForWave50: fullPass === rows.length && rows.length > 0,
  };
}

export async function writePipelineVerifyReport(
  result: PipelineVerifyResult,
  label: string,
): Promise<string> {
  const report = `# MB Pipeline Verify — ${label}

**Generated:** ${result.generatedAt}  
**Scope:** ${result.proposalIds.length} proposals  
**Full pipeline pass:** ${result.summary.fullPass}/${result.summary.total}  
**Ready for Wave 50:** ${result.readyForWave50 ? "**YES**" : "**NO**"}

---

## Checks

| Step | Pass |
|------|-----:|
| Album created + RVAL | ${result.rows.filter((r) => r.albumCreated).length} |
| RVTR linked | ${result.rows.filter((r) => r.rvtrLinked).length} |
| Cover acquired (PG) | ${result.rows.filter((r) => r.coverAcquired).length} |
| R2 published | ${result.rows.filter((r) => r.r2Published).length} |
| CDN 200 | ${result.rows.filter((r) => r.cdn200).length} |
| Public artwork | ${result.rows.filter((r) => r.publicArtwork).length} |
| **All 6** | **${result.summary.fullPass}** |

---

## Per-proposal

| ID | RVTR | RVAL | Album | RVTR | Cover | R2 | CDN | Public | Pass |
|----|------|------|:-----:|:----:|:-----:|:--:|:---:|:------:|:----:|
${result.rows
  .map(
    (r) =>
      `| ${r.proposalId} | ${r.rvtr} | ${r.rval} | ${r.albumCreated ? "✓" : "✗"} | ${r.rvtrLinked ? "✓" : "✗"} | ${r.coverAcquired ? "✓" : "✗"} | ${r.r2Published ? "✓" : "✗"} | ${r.cdn200 ? "✓" : "✗"} | ${r.publicArtwork ? "✓" : "✗"} | ${r.pass ? "PASS" : "FAIL"} |`,
  )
  .join("\n")}

### Failures

${result.rows
  .filter((r) => !r.pass)
  .map((r) => `- **${r.proposalId}** ${r.rval}: ${r.errors.join("; ")}`)
  .join("\n") || "_none_"}

---

\`\`\`bash
npm run mb:pipeline:verify
\`\`\`
`;

  const reportPath = join(process.cwd(), "reports/mb-pipeline-verify.md");
  await writeFile(reportPath, report);
  const jsonPath = join(process.cwd(), "tools/out/mb-pipeline-verify.json");
  await writeFile(jsonPath, JSON.stringify(result, null, 2));
  return reportPath;
}
