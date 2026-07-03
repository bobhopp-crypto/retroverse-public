import { escapeCsv } from "@/lib/cover-integrity/csv-utils";
import {
  BATCH_001_MANDATORY_RVALS,
  isCompilationCluster,
  isPriorityArtist,
  localCoverFileUrl,
  proposeReplacementCandidate,
  type ArtworkLinkCandidate,
} from "@/lib/cover-integrity/propose-candidate";
import { buildRepairQueue, type RepairQueueRow } from "@/lib/cover-integrity/repair-queue";
import type { ScoredCoverWithTrust } from "@/lib/cover-integrity/trust-tier";
import { inspectQuery } from "@/lib/inspect/pg";

export type RepairBatchRow = {
  batchRank: number;
  rval: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  currentCoverPath: string | null;
  currentHash: string | null;
  issueReason: string;
  duplicateHashCount: number;
  trustTier: string;
  proposedSource: string;
  proposedCoverUrlOrPath: string;
  proposedConfidence: number;
  proposedReason: string;
  approve: string;
  curatorNotes: string;
};

export const REPAIR_BATCH_001_SIZE = 50;

function batchSelectScore(
  row: ScoredCoverWithTrust,
  queueRow: RepairQueueRow,
): number {
  let s = queueRow.repairPriority;
  if (row.trustTier === "BROKEN") s += 5000;
  if (BATCH_001_MANDATORY_RVALS.has(row.rval)) s += 4000;
  if (isPriorityArtist(row.artist)) s += 1500;
  if (row.suspicionReasons.includes("same_artist_different_album_shared_image")) s += 800;
  if (isCompilationCluster(row) && !(row.b200Peak != null && row.b200Peak <= 10)) {
    s -= 3000;
  }
  return s;
}

export async function loadArtworkLinksForRvals(
  rvals: string[],
): Promise<ArtworkLinkCandidate[]> {
  if (rvals.length === 0) return [];
  const rows = await inspectQuery<{
    rval: string;
    canonical_cover_path: string | null;
    r2_cover_key: string | null;
    source: string | null;
    confidence_score: number | null;
    review_flag: string | null;
  }>(
    `
    SELECT
      upper(trim(aek.external_key)) AS rval,
      nullif(trim(aal.canonical_cover_path), '') AS canonical_cover_path,
      nullif(trim(aal.r2_cover_key), '') AS r2_cover_key,
      aal.source,
      aal.confidence_score,
      aal.review_flag
    FROM album_external_keys aek
    JOIN album_artwork_links aal ON aal.album_id = aek.album_id
    WHERE upper(trim(aek.external_key)) = ANY($1::text[])
    ORDER BY aek.external_key, aal.confidence_score DESC NULLS LAST
    `,
    [rvals],
  );
  return rows.map((r) => ({
    rval: r.rval,
    canonicalCoverPath: r.canonical_cover_path,
    r2CoverKey: r.r2_cover_key,
    source: r.source,
    confidenceScore: r.confidence_score,
    reviewFlag: r.review_flag,
  }));
}

export function selectRepairBatch001(
  scored: ScoredCoverWithTrust[],
  queue: RepairQueueRow[],
  limit = REPAIR_BATCH_001_SIZE,
): ScoredCoverWithTrust[] {
  const queueByRval = new Map(queue.map((q) => [q.rval, q]));
  const eligible = scored.filter((r) => queueByRval.has(r.rval));

  const ranked = eligible
    .map((row) => ({
      row,
      score: batchSelectScore(row, queueByRval.get(row.rval)!),
    }))
    .sort((a, b) => b.score - a.score);

  const picked = new Map<string, ScoredCoverWithTrust>();

  for (const { row } of ranked) {
    if (row.trustTier === "BROKEN") picked.set(row.rval, row);
  }

  for (const { row } of ranked) {
    if (BATCH_001_MANDATORY_RVALS.has(row.rval)) picked.set(row.rval, row);
  }

  for (const { row } of ranked) {
    if (picked.size >= limit) break;
    if (picked.has(row.rval)) continue;
    if (isCompilationCluster(row)) continue;
    picked.set(row.rval, row);
  }

  if (picked.size < limit) {
    for (const { row } of ranked) {
      if (picked.size >= limit) break;
      if (picked.has(row.rval)) continue;
      if (isCompilationCluster(row) && !(row.b200Peak != null && row.b200Peak <= 10)) continue;
      picked.set(row.rval, row);
    }
  }

  return [...picked.values()]
    .map((row) => ({
      row,
      score: batchSelectScore(row, queueByRval.get(row.rval)!),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.row);
}

export async function buildRepairBatchRows(
  selected: ScoredCoverWithTrust[],
  allScored: ScoredCoverWithTrust[],
): Promise<RepairBatchRow[]> {
  const rvals = selected.map((r) => r.rval);
  const artworkLinks = await loadArtworkLinksForRvals(rvals);

  return selected.map((row, index) => {
    const proposal = proposeReplacementCandidate(row, allScored, artworkLinks);
    return {
      batchRank: index + 1,
      rval: row.rval,
      artist: row.artist,
      album: row.album,
      releaseYear: row.releaseYear,
      currentCoverPath: row.canonicalPath,
      currentHash: row.fileHash,
      issueReason: row.suspicionReasons.join("|"),
      duplicateHashCount: row.duplicateHashCount,
      trustTier: row.trustTier,
      proposedSource: proposal.proposedSource,
      proposedCoverUrlOrPath: proposal.proposedCoverUrlOrPath,
      proposedConfidence: proposal.proposedConfidence,
      proposedReason: proposal.proposedReason,
      approve: "",
      curatorNotes: "",
    };
  });
}

export async function buildRepairBatch001(
  scored: ScoredCoverWithTrust[],
): Promise<RepairBatchRow[]> {
  const queue = buildRepairQueue(scored);
  const selected = selectRepairBatch001(scored, queue);
  return buildRepairBatchRows(selected, scored);
}

export function repairBatchToCsv(rows: RepairBatchRow[]): string {
  const headers = [
    "batch_rank",
    "RVAL",
    "artist",
    "album",
    "release_year",
    "current_cover_path",
    "current_hash",
    "issue_reason",
    "duplicate_hash_count",
    "trust_tier",
    "proposed_source",
    "proposed_cover_url_or_path",
    "proposed_confidence",
    "proposed_reason",
    "approve",
    "curator_notes",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.batchRank,
        r.rval,
        r.artist,
        r.album,
        r.releaseYear,
        r.currentCoverPath,
        r.currentHash,
        r.issueReason,
        r.duplicateHashCount,
        r.trustTier,
        r.proposedSource,
        r.proposedCoverUrlOrPath,
        r.proposedConfidence,
        r.proposedReason,
        r.approve,
        r.curatorNotes,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function repairBatchToHtml(rows: RepairBatchRow[]): string {
  const cards = rows
    .map((r) => {
      const currentImg = localCoverFileUrl(r.currentCoverPath);
      const proposedIsUrl = r.proposedCoverUrlOrPath.startsWith("http");
      const proposedImg = proposedIsUrl
        ? null
        : localCoverFileUrl(
            r.proposedCoverUrlOrPath.startsWith("retroverse/")
              ? r.proposedCoverUrlOrPath
              : null,
          );
      return `
    <article class="card">
      <header>
        <span class="rank">#${r.batchRank}</span>
        <strong>${escapeHtml(r.artist)} — ${escapeHtml(r.album)}</strong>
        <span class="meta">${r.rval} · ${r.trustTier} · dup×${r.duplicateHashCount}</span>
      </header>
      <p class="issue">${escapeHtml(r.issueReason)}</p>
      <div class="covers">
        <figure>
          <figcaption>Current</figcaption>
          ${currentImg ? `<img src="${escapeHtml(currentImg)}" alt="current" />` : `<p class="missing">No local file</p>`}
          <code>${escapeHtml(r.currentCoverPath ?? "")}</code>
          <code class="hash">${escapeHtml(r.currentHash ?? "")}</code>
        </figure>
        <figure>
          <figcaption>Proposed (${escapeHtml(r.proposedSource)}) · ${r.proposedConfidence}%</figcaption>
          ${proposedImg ? `<img src="${escapeHtml(proposedImg)}" alt="proposed" />` : ""}
          <a href="${escapeHtml(r.proposedCoverUrlOrPath)}" target="_blank" rel="noopener">${escapeHtml(r.proposedCoverUrlOrPath)}</a>
          <p>${escapeHtml(r.proposedReason)}</p>
        </figure>
      </div>
    </article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Repair Batch 001 — Cover Review</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f4e9d3; color: #2d3e46; margin: 0; padding: 1.5rem; }
    h1 { font-size: 1.5rem; }
    .card { background: #fff8ee; border: 3px solid #2d3e46; padding: 1rem; margin-bottom: 1.25rem; }
    .covers { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    img { max-width: 100%; height: auto; border: 2px solid #2d3e46; }
    code { display: block; font-size: 0.75rem; word-break: break-all; margin-top: 0.35rem; }
    .issue { font-size: 0.9rem; opacity: 0.85; }
    .meta { display: block; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>Cover Repair Batch 001 (read-only review)</h1>
  <p>${rows.length} rows · no DB or filesystem writes · approve column in CSV</p>
  ${cards}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

export function summarizeBatchCategories(rows: RepairBatchRow[]): Record<string, number> {
  const counts: Record<string, number> = {
    BROKEN: 0,
    HIGH_RISK: 0,
    same_artist_substitution: 0,
    priority_artist: 0,
    compilation_cluster: 0,
    no_local_candidate: 0,
  };
  for (const r of rows) {
    if (r.trustTier === "BROKEN") counts.BROKEN += 1;
    if (r.trustTier === "HIGH_RISK") counts.HIGH_RISK += 1;
    if (r.issueReason.includes("same_artist")) counts.same_artist_substitution += 1;
    if (isPriorityArtist(r.artist)) counts.priority_artist += 1;
    if (r.proposedSource === "discogs_search") counts.no_local_candidate += 1;
    if (/various|now \d/i.test(`${r.artist} ${r.album}`) && r.duplicateHashCount >= 14) {
      counts.compilation_cluster += 1;
    }
  }
  return counts;
}
