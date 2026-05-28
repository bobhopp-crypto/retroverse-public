import type { CoverTrustTier, ScoredCoverWithTrust } from "@/lib/cover-integrity/trust-tier";
import { isEligibleForRepairQueue, toTrustRecord } from "@/lib/cover-integrity/trust-tier";
import { escapeCsv } from "@/lib/cover-integrity/csv-utils";

export type RepairQueueRow = {
  rval: string;
  artist: string;
  album: string;
  currentCover: string | null;
  suspicionReason: string;
  duplicateCount: number;
  trustTier: CoverTrustTier;
  proposedConfidence: number;
  chronologyImportance: number;
  repairPriority: number;
  queueReason: string;
};

function chronologyImportance(row: ScoredCoverWithTrust): number {
  let score = 0;
  if (row.b200Peak != null) {
    if (row.b200Peak <= 10) score += 90;
    else if (row.b200Peak <= 40) score += 60;
    else if (row.b200Peak <= 100) score += 35;
    else score += 15;
  }
  if (row.releaseYear != null) score += 10;
  return score;
}

function repairPriority(row: ScoredCoverWithTrust): number {
  let p = 0;
  if (row.trustTier === "BROKEN") p += 2000;
  if (row.trustTier === "HIGH_RISK") p += 1500;
  if (row.confidenceBand === "VERY_SUSPICIOUS") p += 800;
  if (row.suspicionReasons.includes("same_artist_different_album_shared_image")) p += 600;
  if (row.duplicateHashCount >= 5) p += 200;
  p += chronologyImportance(row);
  p += Math.min(100, row.duplicateHashCount * 8);
  if (row.b200Peak != null && row.b200Peak <= 10) p += 120;
  return p;
}

export function buildRepairQueue(rows: ScoredCoverWithTrust[]): RepairQueueRow[] {
  const queue: RepairQueueRow[] = [];

  for (const row of rows) {
    if (!row.canonicalPath?.trim()) continue;
    const record = toTrustRecord(row);
    if (!isEligibleForRepairQueue(record)) continue;

    const reasons: string[] = [];
    if (row.trustTier === "BROKEN") reasons.push("tier_broken");
    if (row.trustTier === "HIGH_RISK") reasons.push("tier_high_risk");
    if (row.suspicionReasons.includes("same_artist_different_album_shared_image")) {
      reasons.push("same_artist_substitution");
    }
    if (row.confidenceBand === "VERY_SUSPICIOUS") reasons.push("very_suspicious");

    queue.push({
      rval: row.rval,
      artist: row.artist,
      album: row.album,
      currentCover: row.canonicalPath,
      suspicionReason: row.suspicionReasons.join("|") || reasons.join("|"),
      duplicateCount: row.duplicateHashCount,
      trustTier: row.trustTier,
      proposedConfidence: row.confidenceScore,
      chronologyImportance: chronologyImportance(row),
      repairPriority: repairPriority(row),
      queueReason: reasons.join("|"),
    });
  }

  return queue.sort((a, b) => b.repairPriority - a.repairPriority);
}

export function repairQueueToCsv(rows: RepairQueueRow[]): string {
  const headers = [
    "RVAL",
    "artist",
    "album",
    "current cover",
    "suspicion reason",
    "duplicate count",
    "trust tier",
    "proposed confidence",
    "chronology importance",
    "repair priority",
    "queue reason",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.rval,
        r.artist,
        r.album,
        r.currentCover,
        r.suspicionReason,
        r.duplicateCount,
        r.trustTier,
        r.proposedConfidence,
        r.chronologyImportance,
        r.repairPriority,
        r.queueReason,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
