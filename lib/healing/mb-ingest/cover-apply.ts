import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { writeFile as writeReport } from "node:fs/promises";

import { loadAlbumPage } from "@/lib/album/load-album-page";
import {
  acquireCoverViaWelcome,
  findAcquiredCoverRelPath,
} from "@/lib/covers/backfill/acquire-welcome";
import { expectedDossierCoverRelPath } from "@/lib/covers/backfill/dossier-path";
import { coverFsRoot } from "@/lib/covers/backfill/paths";
import { promoteDossierCoverToPg } from "@/lib/covers/backfill/promote-dossier";
import { verifyCoverPromotedByRval } from "@/lib/covers/backfill/verify-rval";
import { loadMbIngestProposal } from "@/lib/healing/mb-ingest/apply-plan";
import { WAVE_10_CUMULATIVE_IDS } from "@/lib/healing/mb-ingest/wave-10-apply";
import { inspectQuery } from "@/lib/inspect/pg";

export const MB_COVER_APPLY_TARGETS = [
  "RVAL000005",
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

/** Fuzzy iTunes — hold for manual review per Phase 7A. */
export const MB_COVER_REVIEW_HELD = new Set(["RVAL000005"]);

const CAA_BASE = "https://coverartarchive.org/release";
const UA = "RetroverseMbCoverApply/1.0 (research@retroverse.local)";

export type CoverApplyOutcome =
  | "acquired"
  | "already_complete"
  | "review_held"
  | "failed";

export type CoverApplyRow = {
  rval: string;
  proposalId: number;
  albumId: number;
  artist: string;
  album: string;
  mbReleaseId: string;
  outcome: CoverApplyOutcome;
  sourceUsed: string | null;
  imageAcquired: boolean;
  acquiredPath: string | null;
  imagePromoted: boolean;
  canonicalCoverPath: string | null;
  artworkLinksCreated: boolean;
  artworkLinksCount: number;
  publicCoverUrl: string | null;
  publicCoverHttpStatus: number | "err" | null;
  albumUrl: string;
  error: string | null;
};

export type MbCoverApplyResult = {
  generatedAt: string;
  targets: string[];
  rows: CoverApplyRow[];
  summary: {
    acquired: number;
    alreadyComplete: number;
    reviewHeld: number;
    failed: number;
    publicCoverVerified: number;
    beforeCovers: number;
    afterCovers: number;
  };
};

export function mbCoverApplyEnabled(): boolean {
  return process.env.RETROVERSE_MB_COVER_APPLY?.trim() === "1";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function headUrl(url: string): Promise<number | "err"> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.status;
  } catch {
    return "err";
  }
}

async function fetchCaaFrontUrl(mbReleaseId: string): Promise<string | null> {
  const id = mbReleaseId.trim();
  if (!id) return null;
  const res = await fetch(`${CAA_BASE}/${id}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    images?: Array<{ front?: boolean; image?: string; thumbnails?: { small?: string } }>;
  };
  const images = data.images ?? [];
  const front = images.find((i) => i.front) ?? images[0];
  return front?.image ?? front?.thumbnails?.small ?? null;
}

async function downloadToDossierPath(
  imageUrl: string,
  relPath: string,
): Promise<boolean> {
  const res = await fetch(imageUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  const abs = join(coverFsRoot(), relPath.replace(/^\/+/, ""));
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buf);
  return true;
}

async function loadArtworkLinkCount(albumId: number): Promise<number> {
  const rows = await inspectQuery<{ n: number }>(
    `SELECT count(*)::int AS n FROM album_artwork_links WHERE album_id = $1`,
    [albumId],
  );
  return rows[0]?.n ?? 0;
}

async function loadTargets(): Promise<
  Array<{
    proposalId: number;
    rval: string;
    albumId: number;
    artist: string;
    album: string;
    releaseYear: number | null;
    mbReleaseId: string;
  }>
> {
  const targetSet = new Set(MB_COVER_APPLY_TARGETS);
  const out: Array<{
    proposalId: number;
    rval: string;
    albumId: number;
    artist: string;
    album: string;
    releaseYear: number | null;
    mbReleaseId: string;
  }> = [];

  for (const proposalId of WAVE_10_CUMULATIVE_IDS) {
    const p = await loadMbIngestProposal(proposalId);
    if (!p || p.status !== "applied") continue;
    const rval = (p.applied_rval ?? p.proposed_rval).trim().toUpperCase();
    if (!targetSet.has(rval as (typeof MB_COVER_APPLY_TARGETS)[number])) continue;
    if (!p.applied_album_id) continue;
    out.push({
      proposalId,
      rval,
      albumId: p.applied_album_id,
      artist: p.artist_name.trim(),
      album: p.proposed_album_title.trim(),
      releaseYear: p.proposed_album_year,
      mbReleaseId: p.mb_release_id?.trim() ?? "",
    });
  }

  return out.sort((a, b) => a.rval.localeCompare(b.rval));
}

async function applyOne(target: {
  proposalId: number;
  rval: string;
  albumId: number;
  artist: string;
  album: string;
  releaseYear: number | null;
  mbReleaseId: string;
}): Promise<CoverApplyRow> {
  const base: CoverApplyRow = {
    rval: target.rval,
    proposalId: target.proposalId,
    albumId: target.albumId,
    artist: target.artist,
    album: target.album,
    mbReleaseId: target.mbReleaseId,
    outcome: "failed",
    sourceUsed: null,
    imageAcquired: false,
    acquiredPath: null,
    imagePromoted: false,
    canonicalCoverPath: null,
    artworkLinksCreated: false,
    artworkLinksCount: 0,
    publicCoverUrl: null,
    publicCoverHttpStatus: null,
    albumUrl: `/album/${target.rval}`,
    error: null,
  };

  if (MB_COVER_REVIEW_HELD.has(target.rval)) {
    return {
      ...base,
      outcome: "review_held",
      error: "Held for manual review — CAA 404 + iTunes fuzzy (Zach Bryan self-titled)",
    };
  }

  const beforePage = await loadAlbumPage(target.rval);
  if (beforePage?.coverUrl) {
    const linksBefore = await loadArtworkLinkCount(target.albumId);
    return {
      ...base,
      outcome: "already_complete",
      sourceUsed: "existing",
      imageAcquired: true,
      acquiredPath: beforePage.coverUrl,
      imagePromoted: true,
      canonicalCoverPath: beforePage.coverUrl,
      artworkLinksCreated: linksBefore > 0,
      artworkLinksCount: linksBefore,
      publicCoverUrl: beforePage.coverUrl,
      publicCoverHttpStatus: await headUrl(beforePage.coverUrl),
    };
  }

  const dossierPath = expectedDossierCoverRelPath(
    target.rval,
    target.artist,
    target.album,
  );
  let sourceUsed: string | null = null;
  let acquiredPath: string | null = await findAcquiredCoverRelPath(target.rval);

  if (!acquiredPath) {
    const caaUrl = await fetchCaaFrontUrl(target.mbReleaseId);
    if (caaUrl) {
      sourceUsed = "musicbrainz_caa";
      const ok = await downloadToDossierPath(caaUrl, dossierPath);
      if (ok) acquiredPath = dossierPath;
    }
  }

  if (!acquiredPath) {
    sourceUsed = sourceUsed ?? "itunes_fallback";
    const acquired = await acquireCoverViaWelcome({
      albumId: target.albumId,
      rval: target.rval,
      artist: target.artist,
      album: target.album,
      releaseYear: target.releaseYear,
      b200Peak: null,
    });
    if (!acquired.ok) {
      return {
        ...base,
        sourceUsed,
        error: acquired.reason,
      };
    }
    acquiredPath = acquired.deployRel ?? (await findAcquiredCoverRelPath(target.rval));
    if (!acquiredPath) {
      return { ...base, sourceUsed, error: "itunes_no_file_after_acquire" };
    }
  } else if (!sourceUsed) {
    sourceUsed = acquiredPath === dossierPath ? "musicbrainz_caa" : "local_existing";
  }

  try {
    await promoteDossierCoverToPg({
      albumId: target.albumId,
      rval: target.rval,
      canonicalCoverPath: acquiredPath,
    });
  } catch (e) {
    return {
      ...base,
      sourceUsed,
      imageAcquired: true,
      acquiredPath,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const verified = await verifyCoverPromotedByRval(target.rval);
  const linksAfter = await loadArtworkLinkCount(target.albumId);
  const afterPage = await loadAlbumPage(target.rval);
  const publicCoverUrl = afterPage?.coverUrl ?? null;
  const httpStatus = publicCoverUrl ? await headUrl(publicCoverUrl) : null;

  return {
    ...base,
    outcome: verified.ok && publicCoverUrl ? "acquired" : "failed",
    sourceUsed,
    imageAcquired: true,
    acquiredPath,
    imagePromoted: verified.ok,
    canonicalCoverPath: verified.canonicalCoverPath,
    artworkLinksCreated: linksAfter > 0,
    artworkLinksCount: linksAfter,
    publicCoverUrl,
    publicCoverHttpStatus: httpStatus,
    error:
      verified.ok && publicCoverUrl
        ? null
        : verified.ok
          ? "pg_promoted_but_public_coverUrl_null"
          : "rval_verify_failed",
  };
}

export async function runMbCoverApply(): Promise<MbCoverApplyResult> {
  if (!mbCoverApplyEnabled()) {
    throw new Error(
      "MB cover apply disabled. Set RETROVERSE_MB_COVER_APPLY=1 to enable.",
    );
  }

  const targets = await loadTargets();
  const rows: CoverApplyRow[] = [];

  for (let i = 0; i < targets.length; i++) {
    if (i > 0) await sleep(1200);
    rows.push(await applyOne(targets[i]!));
  }

  const acquired = rows.filter((r) => r.outcome === "acquired").length;
  const alreadyComplete = rows.filter((r) => r.outcome === "already_complete").length;
  const reviewHeld = rows.filter((r) => r.outcome === "review_held").length;
  const failed = rows.filter((r) => r.outcome === "failed").length;
  const publicCoverVerified = rows.filter(
    (r) => r.publicCoverUrl && r.publicCoverHttpStatus === 200,
  ).length;
  const afterCovers = rows.filter((r) => Boolean(r.publicCoverUrl)).length;

  return {
    generatedAt: new Date().toISOString(),
    targets: [...MB_COVER_APPLY_TARGETS],
    rows,
    summary: {
      acquired,
      alreadyComplete,
      reviewHeld,
      failed,
      publicCoverVerified,
      beforeCovers: 0,
      afterCovers,
    },
  };
}

export async function writeMbCoverApplyReport(): Promise<{
  reportPath: string;
  jsonPath: string;
  result: MbCoverApplyResult;
}> {
  const result = await runMbCoverApply();
  const { rows, summary } = result;

  const report = `# MB Cover Apply — Phase 7B

**Generated:** ${result.generatedAt}  
**Scope:** Wave 5 + Wave 10 MB-ingested albums only (${result.targets.length} targets)  
**Guard:** \`RETROVERSE_MB_COVER_APPLY=1\`

---

## Before / After

| Metric | Before | After |
|--------|-------:|------:|
| Public covers | **${summary.beforeCovers}** / 10 | **${summary.afterCovers}** / 10 |
| CDN HTTP 200 verified | — | **${summary.publicCoverVerified}** / 10 |

---

## Summary

| Outcome | Count |
|---------|------:|
| Acquired + promoted | **${summary.acquired}** |
| Already complete | ${summary.alreadyComplete} |
| Review held | **${summary.reviewHeld}** |
| Failed | **${summary.failed}** |

---

## Per-album results

| RVAL | Album | Source | Acquired | Promoted | canonical_cover_path | artwork_links | public coverUrl | CDN |
|------|-------|--------|:--------:|:--------:|----------------------|:-------------:|-----------------|:---:|
${rows
  .map(
    (r) =>
      `| ${r.rval} | ${r.album} | ${r.sourceUsed ?? "—"} | ${r.imageAcquired ? "✓" : "✗"} | ${r.imagePromoted ? "✓" : "✗"} | ${r.canonicalCoverPath ? "✓" : "✗"} | ${r.artworkLinksCount} | ${r.publicCoverUrl ? "✓" : "✗"} | ${r.publicCoverHttpStatus ?? "—"} |`,
  )
  .join("\n")}

---

## Detail

${rows
  .map(
    (r) => `### ${r.rval} — ${r.album}

- **Outcome:** ${r.outcome}
- **Source:** ${r.sourceUsed ?? "—"}
- **MB release:** \`${r.mbReleaseId}\`
- **Acquired path:** ${r.acquiredPath ?? "—"}
- **Album URL:** [${r.albumUrl}](${r.albumUrl})
- **Public coverUrl:** ${r.publicCoverUrl ?? "—"}
- **CDN HEAD:** ${r.publicCoverHttpStatus ?? "—"}
- **Error:** ${r.error ?? "—"}
`,
  )
  .join("\n")}

---

## Review-needed

${rows
  .filter((r) => r.outcome === "review_held" || r.outcome === "failed")
  .map((r) => `- **${r.rval}** (${r.album}): ${r.error ?? r.outcome}`)
  .join("\n") || "_none_"}

---

## Workflow used

1. MusicBrainz Cover Art Archive → \`expectedDossierCoverRelPath\`
2. iTunes fallback via \`acquireCoverViaWelcome\` (CAA miss)
3. \`promoteDossierCoverToPg\` → \`albums.canonical_cover_path\` + \`album_artwork_links\`
4. Verify \`loadAlbumPage(rval).coverUrl\`

\`\`\`bash
RETROVERSE_MB_COVER_APPLY=1 npm run mb:cover:apply
npm run mb:real-world:audit
\`\`\`
`;

  const reportPath = join(process.cwd(), "reports/mb-cover-apply.md");
  const jsonPath = join(process.cwd(), "tools/out/mb-cover-apply.json");
  await writeReport(reportPath, report);
  await writeReport(jsonPath, JSON.stringify(result, null, 2));

  return { reportPath, jsonPath, result };
}
