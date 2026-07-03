import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { reusedCoversToCsv, scoredRowsToCsv } from "@/lib/cover-integrity/csv";
import { loadCoverInventoryFromPg } from "@/lib/cover-integrity/load-inventory";
import {
  albumTitleKey,
  basenameFromCoverPath,
  normalizeArtistKey,
  parseCoverFilename,
  slugToTitleKey,
} from "@/lib/cover-integrity/normalize";
import { buildRepairQueue, repairQueueToCsv } from "@/lib/cover-integrity/repair-queue";
import {
  defaultCoverFsRoot,
  resolveCoverFilePath,
  scoreCoverRow,
} from "@/lib/cover-integrity/score";
import { enrichWithTrustTier, toTrustRecord } from "@/lib/cover-integrity/trust-tier";
import { buildTrustRegistry } from "@/lib/cover-integrity/trust-registry";
import type { CoverAuditSummary, ScoredCoverRow } from "@/lib/cover-integrity/types";
import type { ScoredCoverWithTrust } from "@/lib/cover-integrity/trust-tier";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(path: string): Promise<{ hash: string; bytes: number } | null> {
  try {
    const buf = await readFile(path);
    const hash = createHash("md5").update(buf).digest("hex");
    return { hash, bytes: buf.length };
  } catch {
    return null;
  }
}

async function countOrphanCoverFiles(
  fsRoot: string,
  assignedPaths: Set<string>,
): Promise<number> {
  if (process.env.COVER_AUDIT_SKIP_ORPHAN_SCAN === "1") return -1;
  const coversDir = join(fsRoot, "retroverse/covers");
  let orphans = 0;
  let entries: string[];
  try {
    entries = await readdir(coversDir);
  } catch {
    return 0;
  }

  for (const entry of entries) {
    if (!/^RVAL\d{6}$/i.test(entry)) continue;
    const dir = join(coversDir, entry);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!IMAGE_EXT.test(file)) continue;
      const rel = `retroverse/covers/${entry}/${file}`;
      if (!assignedPaths.has(rel)) orphans += 1;
    }
  }
  return orphans;
}

export type RunCoverAuditOptions = {
  fsRoot?: string;
  hashCache?: Map<string, string>;
};

export async function runCoverIntegrityAudit(
  options: RunCoverAuditOptions = {},
): Promise<{
  rows: ScoredCoverWithTrust[];
  summary: CoverAuditSummary;
  highRiskCsv: string;
  auditCsv: string;
  reusedCsv: string;
  repairQueueCsv: string;
  trustRegistry: ReturnType<typeof buildTrustRegistry>;
}> {
  const fsRoot = options.fsRoot ?? defaultCoverFsRoot();
  const inventory = await loadCoverInventoryFromPg();
  const hashCache = options.hashCache ?? new Map<string, string>();

  const preRows: Omit<
    ScoredCoverRow,
    | "confidenceScore"
    | "confidenceBand"
    | "suspicionReasons"
    | "duplicateHashCount"
    | "normalizationDrift"
    | "titleExactMatch"
    | "titlePartialMatch"
    | "artistExactMatch"
  >[] = [];

  const assignedPaths = new Set<string>();

  for (const item of inventory) {
    const canonicalPath = item.canonicalPath;
    if (canonicalPath) assignedPaths.add(canonicalPath.replace(/^\/+/, ""));

    const coverFilename = basenameFromCoverPath(canonicalPath);
    const parsed = coverFilename ? parseCoverFilename(coverFilename) : null;
    const filePath = resolveCoverFilePath(fsRoot, canonicalPath);
    const exists = filePath ? await fileExists(filePath) : false;

    let fileHash: string | null = null;
    let fileBytes: number | null = null;
    if (exists && filePath) {
      const cached = hashCache.get(filePath);
      if (cached) {
        fileHash = cached;
      } else {
        const hashed = await hashFile(filePath);
        if (hashed) {
          fileHash = hashed.hash;
          fileBytes = hashed.bytes;
          hashCache.set(filePath, fileHash);
        }
      }
    }

    preRows.push({
      ...item,
      coverFilename,
      fileExists: exists,
      fileHash,
      fileBytes,
      filenameArtistSlug: parsed?.artistSlug ?? null,
      filenameAlbumSlug: parsed?.albumSlug ?? null,
      titleKeyAlbum: albumTitleKey(item.album),
      titleKeyFilename: parsed?.albumSlug ? slugToTitleKey(parsed.albumSlug) : null,
      artistKey: normalizeArtistKey(item.artist),
      artistKeyFilename: parsed?.artistSlug ? slugToTitleKey(parsed.artistSlug) : null,
    });
  }

  const hashToRvals = new Map<string, string[]>();
  const hashToArtistAlbum = new Map<string, { artistKey: string; titleKey: string }[]>();

  for (const row of preRows) {
    if (!row.fileHash) continue;
    const list = hashToRvals.get(row.fileHash) ?? [];
    list.push(row.rval);
    hashToRvals.set(row.fileHash, list);

    const pairs = hashToArtistAlbum.get(row.fileHash) ?? [];
    pairs.push({ artistKey: row.artistKey, titleKey: row.titleKeyAlbum });
    hashToArtistAlbum.set(row.fileHash, pairs);
  }

  function sameArtistHashConflict(hash: string | null, artistKey: string, titleKey: string): boolean {
    if (!hash) return false;
    const pairs = hashToArtistAlbum.get(hash) ?? [];
    const sameArtist = pairs.filter((p) => p.artistKey === artistKey);
    if (sameArtist.length < 2) return false;
    const distinctTitles = new Set(sameArtist.map((p) => p.titleKey));
    if (distinctTitles.size < 2) return false;
    return sameArtist.some((p) => p.titleKey !== titleKey);
  }

  const scored: ScoredCoverWithTrust[] = preRows.map((row) => {
    const duplicateHashCount = row.fileHash
      ? (hashToRvals.get(row.fileHash)?.length ?? 0)
      : 0;
    const scoredFields = scoreCoverRow({
      row,
      duplicateHashCount,
      sameArtistHashConflict: sameArtistHashConflict(
        row.fileHash,
        row.artistKey,
        row.titleKeyAlbum,
      ),
    });
    return enrichWithTrustTier({ ...row, ...scoredFields });
  });

  const trustRecords = scored.map(toTrustRecord);
  const trustRegistry = buildTrustRegistry(trustRecords);
  const repairQueue = buildRepairQueue(scored);

  const orphanFileCount = await countOrphanCoverFiles(fsRoot, assignedPaths);

  const confidenceDistribution = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    VERY_SUSPICIOUS: 0,
  } as Record<ScoredCoverRow["confidenceBand"], number>;

  for (const r of scored) confidenceDistribution[r.confidenceBand] += 1;

  const suspiciousCount = scored.filter((r) => {
    if (!r.canonicalPath?.trim() || !r.fileExists) return false;
    return r.confidenceBand === "VERY_SUSPICIOUS";
  }).length;

  const missingAssignmentCount = scored.filter((r) => !r.canonicalPath?.trim()).length;

  const normalizationDriftCount = scored.filter((r) => r.normalizationDrift).length;

  const reusedEntries = [...hashToRvals.entries()]
    .filter(([, rvals]) => rvals.length > 1)
    .map(([hash, rvals]) => {
      const sampleRows = scored.filter((r) => r.fileHash === hash).slice(0, 8);
      const artists = new Set(sampleRows.map((r) => r.artistKey));
      const pairs = hashToArtistAlbum.get(hash) ?? [];
      const byArtist = new Map<string, Set<string>>();
      for (const p of pairs) {
        const set = byArtist.get(p.artistKey) ?? new Set();
        set.add(p.titleKey);
        byArtist.set(p.artistKey, set);
      }
      let sameArtistConflict = false;
      for (const titles of byArtist.values()) {
        if (titles.size > 1) {
          sameArtistConflict = true;
          break;
        }
      }
      return {
        fileHash: hash,
        albumCount: rvals.length,
        artistCount: artists.size,
        sampleRvals: rvals.slice(0, 6).join("|"),
        sampleArtists: sampleRows.map((r) => r.artist).slice(0, 4).join("|"),
        sampleAlbums: sampleRows.map((r) => r.album).slice(0, 4).join("|"),
        sameArtistConflict,
      };
    })
    .sort((a, b) => b.albumCount - a.albumCount);

  const sameArtistSubstitutionCount = scored.filter((r) =>
    r.suspicionReasons.includes("same_artist_different_album_shared_image"),
  ).length;

  const eltonTooLow =
    scored.find(
      (r) =>
        r.artist.toLowerCase().includes("elton john") &&
        r.album.toLowerCase().includes("too low"),
    ) ?? null;
  const eltonCaribou =
    scored.find(
      (r) =>
        r.artist.toLowerCase().includes("elton john") &&
        r.album.toLowerCase().includes("caribou"),
    ) ?? null;
  const eltonSharedHash =
    !!eltonTooLow?.fileHash &&
    !!eltonCaribou?.fileHash &&
    eltonTooLow.fileHash === eltonCaribou.fileHash;

  const summary: CoverAuditSummary = {
    auditedAt: new Date().toISOString(),
    coverFsRoot: fsRoot,
    totalPgAlbumsWithRval: inventory.length,
    totalWithCanonicalPath: inventory.filter((i) => i.canonicalPath).length,
    totalMissingPath: inventory.filter((i) => !i.canonicalPath).length,
    totalFileMissingOnDisk: scored.filter((r) => r.canonicalPath && !r.fileExists).length,
    totalFilesHashed: scored.filter((r) => r.fileHash).length,
    totalOrphanCoverFiles: orphanFileCount,
    confidenceDistribution,
    suspiciousCount,
    missingAssignmentCount,
    normalizationDriftCount,
    topReusedHashes: reusedEntries.slice(0, 15).map((e) => ({
      hash: e.fileHash,
      albumCount: e.albumCount,
      sampleRvals: e.sampleRvals.split("|"),
    })),
    sameArtistSubstitutionCount,
    trustTierCounts: trustRegistry.tierCounts,
    repairQueueCount: repairQueue.length,
    spotChecks: {
      eltonTooLowForZero: eltonTooLow,
      eltonCaribou,
      eltonSharedHash,
    },
  };

  const highRisk = scored
    .filter((r) => {
      if (!r.canonicalPath?.trim() || !r.fileExists) return false;
      return (
        r.confidenceBand === "VERY_SUSPICIOUS" ||
        (r.confidenceBand === "LOW" &&
          r.suspicionReasons.some((s) =>
            /mismatch|shared_image|rval_path|high_frequency/.test(s),
          ))
      );
    })
    .sort((a, b) => a.confidenceScore - b.confidenceScore);

  return {
    rows: scored,
    summary,
    auditCsv: scoredRowsToCsv(scored),
    highRiskCsv: scoredRowsToCsv(highRisk),
    reusedCsv: reusedCoversToCsv(reusedEntries),
    repairQueueCsv: repairQueueToCsv(repairQueue),
    trustRegistry,
  };
}
