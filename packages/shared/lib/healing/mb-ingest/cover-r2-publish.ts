import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadAlbumPage } from "@/lib/album/load-album-page";
import { publishLocalCoverToR2 } from "@/lib/covers/backfill/publish-r2";
import { verifyCoverPromotedByRval } from "@/lib/covers/backfill/verify-rval";
import { inspectQuery } from "@/lib/inspect/pg";

export const MB_COVER_R2_PUBLISH_TARGETS = [
  "RVAL000006",
  "RVAL000009",
  "RVAL000012",
  "RVAL000014",
  "RVAL000015",
  "RVAL000016",
  "RVAL000018",
  "RVAL000019",
  "RVAL000024",
] as const;

export type MbCoverR2PublishRow = {
  rval: string;
  canonicalCoverPath: string | null;
  coverUrl: string | null;
  published: boolean;
  r2HeadOk: boolean;
  cdnHeadStatus: number | "err" | null;
  byteSize: number;
  error: string | null;
};

export type MbCoverR2PublishResult = {
  generatedAt: string;
  rootCause: string;
  fixApplied: string;
  rows: MbCoverR2PublishRow[];
  summary: {
    attempted: number;
    uploaded: number;
    cdn200: number;
    failures: number;
  };
  automationRecommendation: string;
};

async function loadCanonicalPath(rval: string): Promise<string | null> {
  const rows = await inspectQuery<{ canonical_cover_path: string | null }>(
    `
    SELECT nullif(trim(al.canonical_cover_path), '') AS canonical_cover_path
    FROM albums al
    JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE upper(trim(aek.external_key)) = $1
    LIMIT 1
    `,
    [rval.trim().toUpperCase()],
  );
  return rows[0]?.canonical_cover_path ?? null;
}

export async function runMbCoverR2Publish(): Promise<MbCoverR2PublishResult> {
  const rows: MbCoverR2PublishRow[] = [];

  for (const rval of MB_COVER_R2_PUBLISH_TARGETS) {
    const canonicalCoverPath = await loadCanonicalPath(rval);
    if (!canonicalCoverPath) {
      rows.push({
        rval,
        canonicalCoverPath: null,
        coverUrl: null,
        published: false,
        r2HeadOk: false,
        cdnHeadStatus: null,
        byteSize: 0,
        error: "no_canonical_cover_path",
      });
      continue;
    }

    const pageBefore = await loadAlbumPage(rval);
    const pub = await publishLocalCoverToR2({
      r2Key: canonicalCoverPath,
      localRelPath: canonicalCoverPath,
      publicCdnUrl: pageBefore?.coverUrl ?? null,
    });
    const pageAfter = await loadAlbumPage(rval);
    const verified = await verifyCoverPromotedByRval(rval);

    rows.push({
      rval,
      canonicalCoverPath: verified.canonicalCoverPath ?? canonicalCoverPath,
      coverUrl: pageAfter?.coverUrl ?? null,
      published: pub.ok && pub.r2HeadOk,
      r2HeadOk: pub.r2HeadOk,
      cdnHeadStatus: pub.cdnHeadStatus,
      byteSize: pub.byteSize,
      error: pub.ok ? pub.error : pub.error ?? "publish_failed",
    });
  }

  const uploaded = rows.filter((r) => r.published).length;
  const cdn200 = rows.filter((r) => r.cdnHeadStatus === 200).length;
  const failures = rows.filter((r) => !r.published).length;

  return {
    generatedAt: new Date().toISOString(),
    rootCause:
      "cover-apply + cover-backfill write local dossier files and promoteDossierCoverToPg only — R2 PutObject exists in retroverse-welcome curator path (persistCoverBytes) but is never called by MB/dossier backfill.",
    fixApplied:
      "publishLocalCoverToR2 — PutObject to r2_cover_key from local welcome/public mirror, verified via R2 HeadObject + CDN HEAD.",
    rows,
    summary: {
      attempted: rows.length,
      uploaded,
      cdn200,
      failures,
    },
    automationRecommendation:
      "Call publishLocalCoverToR2 immediately after promoteDossierCoverToPg in cover-apply.ts and run-batch-core.ts so every dossier promote auto-reaches R2.",
  };
}

export async function writeMbCoverR2PublishReport(): Promise<{
  reportPath: string;
  jsonPath: string;
  result: MbCoverR2PublishResult;
}> {
  const result = await runMbCoverR2Publish();

  const report = `# MB Cover R2 Publish — Phase 7C

**Generated:** ${result.generatedAt}  
**Scope:** 9 MB-recovered albums (Wave 5+10)

---

## Root cause

${result.rootCause}

| Question | Answer |
|----------|--------|
| Production upload path | \`retroverse-welcome/lib/curator-cover-persist.ts\` → \`uploadCoverBytesToR2\` (curator saves only) |
| Normal upload command | **None for dossier backfill** — curator API save path only; no batch R2 sync in repo |
| Upload step status | **Missing / bypassed** for \`promoteDossierCoverToPg\` pipeline |
| Fixable with existing infra | **Yes** — same S3-compatible R2 client + env from welcome \`.env.local\` |

---

## Fix applied

${result.fixApplied}

---

## Results

| Metric | Count |
|--------|------:|
| Attempted | ${result.summary.attempted} |
| R2 uploaded + HEAD ok | **${result.summary.uploaded}** |
| CDN HEAD 200 | **${result.summary.cdn200}** |
| Failures | **${result.summary.failures}** |

| RVAL | canonical_cover_path | R2 HEAD | CDN HEAD | coverUrl | Bytes |
|------|---------------------|:-------:|:--------:|:--------:|------:|
${result.rows
  .map(
    (r) =>
      `| ${r.rval} | ${r.canonicalCoverPath ? "✓" : "✗"} | ${r.r2HeadOk ? "✓" : "✗"} | ${r.cdnHeadStatus ?? "—"} | ${r.coverUrl ? "✓" : "✗"} | ${r.byteSize.toLocaleString()} |`,
  )
  .join("\n")}

---

## Failures

${result.rows
  .filter((r) => !r.published)
  .map((r) => `- **${r.rval}**: ${r.error ?? "unknown"}`)
  .join("\n") || "_none_"}

---

## Future automation

${result.automationRecommendation}

\`\`\`bash
npm run mb:cover:r2-publish
\`\`\`
`;

  const reportPath = join(process.cwd(), "reports/mb-cover-r2-publish.md");
  const jsonPath = join(process.cwd(), "tools/out/mb-cover-r2-publish.json");
  await writeFile(reportPath, report);
  await writeFile(jsonPath, JSON.stringify(result, null, 2));

  return { reportPath, jsonPath, result };
}
