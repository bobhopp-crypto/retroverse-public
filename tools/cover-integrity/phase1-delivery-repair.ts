#!/usr/bin/env npx tsx
/**
 * Phase 1 — Delivery repair: publish local covers missing on R2 CDN (404).
 * Does not mutate PG assignments, tiers, or quarantine.
 *
 * Usage:
 *   npx tsx tools/cover-integrity/phase1-delivery-repair.ts
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { loadCoverInventoryFromPg } from "@/lib/cover-integrity/load-inventory";
import { defaultCoverFsRoot, resolveCoverFilePath } from "@/lib/cover-integrity/score";
import { publishLocalCoverToR2 } from "@/lib/covers/backfill/publish-r2";

const CDN_TIMEOUT_MS = Number(process.env.PHASE1_CDN_TIMEOUT_MS ?? "12000");
const SCAN_CONCURRENCY = Number(process.env.PHASE1_SCAN_CONCURRENCY ?? "12");
const PUBLISH_CONCURRENCY = Number(process.env.PHASE1_PUBLISH_CONCURRENCY ?? "4");

type Candidate = {
  rval: string;
  artist: string;
  album: string;
  canonicalPath: string;
  cdnUrl: string;
  localAbs: string;
};

type PublishRow = {
  rval: string;
  canonicalPath: string;
  published: boolean;
  verified: boolean;
  r2HeadOk: boolean;
  cdnHeadBefore: number | "err" | null;
  cdnHeadAfter: number | "err" | null;
  byteSize: number;
  error: string | null;
};

async function headCdn(url: string): Promise<number | "err"> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(CDN_TIMEOUT_MS),
    });
    return res.status;
  } catch {
    return "err";
  }
}

async function mapPool<T, R>(items: T[], fn: (item: T, index: number) => Promise<R>, n: number): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx]!, idx);
    }
  });
  await Promise.all(workers);
  return out;
}

function displayRate(totalRval: number, assigned: number, cdn404: number): number {
  return Math.round(((assigned - cdn404) / totalRval) * 1000) / 10;
}

async function countAssignedCdn404(
  assigned: Array<{ rval: string; canonicalPath: string; cdnUrl: string }>,
): Promise<number> {
  const statuses = await mapPool(
    assigned,
    async (row) => headCdn(row.cdnUrl),
    SCAN_CONCURRENCY,
  );
  return statuses.filter((s) => s === 404).length;
}

async function main() {
  const outDir = join(process.cwd(), "reports/cover-integrity");
  await mkdir(outDir, { recursive: true });

  const inventory = await loadCoverInventoryFromPg();
  const fsRoot = defaultCoverFsRoot();
  const totalRval = inventory.length;
  const assignedRows = inventory.filter((r) => r.canonicalPath?.trim());

  console.error(`Inventory: ${totalRval} RVAL albums, ${assignedRows.length} assigned`);

  const assignedForScan = assignedRows.map((row) => {
    const canonicalPath = row.canonicalPath!.trim();
    const cdnUrl = resolveAlbumCoverUrlFromRow({
      cover_path: canonicalPath,
      artwork_path: canonicalPath,
      r2_cover_key: canonicalPath,
    })!;
    return { rval: row.rval, canonicalPath, cdnUrl };
  });

  console.error("Scanning assigned covers for CDN 404 + local file…");
  const scanResults = await mapPool(
    assignedForScan,
    async (row) => {
      const localAbs = resolveCoverFilePath(fsRoot, row.canonicalPath);
      const localExists = localAbs ? existsSync(localAbs) : false;
      if (!localExists) return null;
      const status = await headCdn(row.cdnUrl);
      if (status !== 404) return null;
      const inv = inventory.find((i) => i.rval === row.rval)!;
      return {
        rval: row.rval,
        artist: inv.artist,
        album: inv.album,
        canonicalPath: row.canonicalPath,
        cdnUrl: row.cdnUrl,
        localAbs: localAbs!,
      } satisfies Candidate;
    },
    SCAN_CONCURRENCY,
  );

  const candidates = scanResults.filter((r): r is Candidate => r != null);
  const cdn404Before = await countAssignedCdn404(assignedForScan);
  const displayBefore = displayRate(totalRval, assignedRows.length, cdn404Before);

  console.error(`Candidates (404 + local): ${candidates.length}`);
  console.error(`Assigned CDN 404 before: ${cdn404Before}`);
  console.error(`Display rate before: ${displayBefore}%`);

  const publishRows: PublishRow[] = [];

  await mapPool(
    candidates,
    async (c) => {
      const cdnHeadBefore = 404;
      const pub = await publishLocalCoverToR2({
        r2Key: c.canonicalPath,
        localRelPath: c.canonicalPath,
        publicCdnUrl: c.cdnUrl,
      });

      let cdnHeadAfter = pub.cdnHeadStatus;
      if (cdnHeadAfter !== 200) {
        await new Promise((r) => setTimeout(r, 1500));
        cdnHeadAfter = await headCdn(c.cdnUrl);
      }

      const published = pub.r2HeadOk;
      const verified = cdnHeadAfter === 200;

      publishRows.push({
        rval: c.rval,
        canonicalPath: c.canonicalPath,
        published,
        verified,
        r2HeadOk: pub.r2HeadOk,
        cdnHeadBefore,
        cdnHeadAfter,
        byteSize: pub.byteSize,
        error: verified ? null : pub.error ?? `cdn_head_${String(cdnHeadAfter)}`,
      });

      if (publishRows.length % 50 === 0) {
        console.error(`  published ${publishRows.length}/${candidates.length}…`);
      }
    },
    PUBLISH_CONCURRENCY,
  );

  publishRows.sort((a, b) => a.rval.localeCompare(b.rval));

  console.error("Re-scanning assigned CDN 404 count after publish…");
  const cdn404After = await countAssignedCdn404(assignedForScan);
  const displayAfter = displayRate(totalRval, assignedRows.length, cdn404After);

  const attempted = candidates.length;
  const published = publishRows.filter((r) => r.published).length;
  const verified = publishRows.filter((r) => r.verified).length;
  const failed = publishRows.filter((r) => !r.verified).length;
  const remaining404InBatch = publishRows.filter((r) => r.cdnHeadAfter === 404).length;

  const result = {
    generatedAt: new Date().toISOString(),
    phase: "phase1-delivery-repair",
    scope: "CDN 404 with local file — no assignment changes",
    totals: {
      totalRvalAlbums: totalRval,
      assigned: assignedRows.length,
      attempted,
      published,
      verified,
      failed,
      remaining404InBatch,
      assignedCdn404Before: cdn404Before,
      assignedCdn404After: cdn404After,
      displayRateBeforePct: displayBefore,
      displayRateAfterPct: displayAfter,
    },
    rows: publishRows,
    failures: publishRows.filter((r) => !r.verified).map((r) => ({
      rval: r.rval,
      error: r.error,
      cdnHeadAfter: r.cdnHeadAfter,
      published: r.published,
    })),
  };

  const jsonPath = join(outDir, "phase1-delivery-results.json");
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const md = `# Phase 1 — Delivery Repair Report

**Generated:** ${result.generatedAt}  
**Scope:** Publish local JPEGs for confirmed CDN **404** assignments. No assignment, tier, or quarantine changes.

---

## Summary

| Metric | Count |
| --- | ---: |
| **Attempted** | **${attempted}** |
| **Published** (R2 PutObject + R2 HEAD ok) | **${published}** |
| **Verified** (CDN HEAD 200 after upload) | **${verified}** |
| **Failed** | **${failed}** |
| **Remaining 404** (in repaired batch) | **${remaining404InBatch}** |

---

## Display rate (operational)

Formula: \`(assigned − assigned CDN 404) / total RVAL albums\`

| | CDN 404 (assigned) | Display rate |
| --- | ---: | ---: |
| **Before** | ${cdn404Before} | **${displayBefore}%** |
| **After** | ${cdn404After} | **${displayAfter}%** |
| **Delta** | ${cdn404After - cdn404Before} | **${Math.round((displayAfter - displayBefore) * 10) / 10} pp** |

Corpus: **${totalRval}** RVAL albums · **${assignedRows.length}** assigned.

---

## Failures

${result.failures.length === 0 ? "_None._" : result.failures.slice(0, 100).map((f) => `- **${f.rval}**: ${f.error ?? "unknown"} (CDN after: ${f.cdnHeadAfter})`).join("\n")}${result.failures.length > 100 ? `\n\n_…and ${result.failures.length - 100} more (see phase1-delivery-results.json)._` : ""}

---

## Artifacts

- \`reports/cover-integrity/phase1-delivery-results.json\`
- Post-run: \`npm run cover:audit\` → \`reports/cover_integrity/summary.json\`

---

## Method

1. Scan all assigned albums — CDN HEAD + local file check.
2. Select **404 + local exists** only.
3. \`publishLocalCoverToR2\` per candidate (PutObject + R2 HEAD + CDN HEAD).
4. Re-verify CDN HEAD after 1.5s cache wait if first check non-200.
5. Re-scan full assigned corpus for CDN 404 count.
`;

  const mdPath = join(outDir, "phase1-delivery-report.md");
  await writeFile(mdPath, md, "utf8");

  console.log(JSON.stringify(result.totals, null, 2));
  console.log(`\nWrote:\n  ${mdPath}\n  ${jsonPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
