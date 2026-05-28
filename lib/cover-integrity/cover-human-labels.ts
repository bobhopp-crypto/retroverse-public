import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";

export function humanTrustLabel(tier: string): string {
  const t = tier.toUpperCase();
  if (t === "TRUSTED") return "Looks OK";
  if (t === "HIGH_RISK") return "Needs Review";
  if (t === "BROKEN") return "Missing Cover";
  return "Needs Review";
}

export function humanIssueSummary(issueReason: string): string {
  const parts = issueReason.split("|").filter(Boolean);
  return parts.map(humanIssueCode).join(" · ") || "Flagged for review";
}

function humanIssueCode(code: string): string {
  const c = code.trim().toLowerCase();
  if (c.includes("same_artist") && c.includes("shared")) {
    return "Multiple albums by this artist share one image";
  }
  if (c.includes("duplicate") || c.includes("shared_image")) {
    return "Multiple albums share this image";
  }
  if (c.includes("file_missing") || c.includes("missing")) {
    return "Cover image is missing";
  }
  if (c.includes("title") && c.includes("mismatch")) {
    return "Title may not match the album";
  }
  if (c.includes("year")) return "Release year may be off";
  if (c.includes("compilation") || c.includes("various")) {
    return "Compilation or various-artists album";
  }
  return code.replaceAll("_", " ");
}

export function humanProposedReason(reason: string): string {
  if (!reason.trim()) return "A different cover may work better.";
  if (/discogs/i.test(reason)) return "Try finding a better cover on Discogs.";
  if (/local|file/i.test(reason)) return "Another image file may be available.";
  return reason;
}

export function humanRepairDecision(decision: string): string {
  if (decision === "approve") return "Approved fix";
  if (decision === "reject") return "Rejected suggestion";
  if (decision === "skip") return "Skipped";
  if (decision === "needs_discogs_pull") return "Need better source";
  return decision;
}

export function humanTrainingDecision(decision: string): string {
  if (decision === "correct") return "Kept current";
  if (decision === "wrong") return "Preferred suggested";
  if (decision === "unsure") return "Not sure";
  if (decision === "needs_pull") return "Need better image";
  return decision;
}

export type CoverTechnicalDetails = {
  rval: string;
  batchId?: string;
  trustTier: string;
  issueReason: string;
  currentHash: string | null;
  proposedHash: string | null;
  duplicateHashCount: number;
  proposedSource: string;
  proposedConfidence: number;
  proposedReason: string;
  currentCoverPath: string | null;
  proposedCoverUrlOrPath: string;
};

export function technicalDetailsFromRow(
  row: RepairBatchCsvRow,
  extras?: { batchId?: string; proposedHash?: string | null },
): CoverTechnicalDetails {
  return {
    rval: row.rval,
    batchId: extras?.batchId,
    trustTier: row.trustTier,
    issueReason: row.issueReason,
    currentHash: row.currentHash,
    proposedHash: extras?.proposedHash ?? null,
    duplicateHashCount: row.duplicateHashCount,
    proposedSource: row.proposedSource,
    proposedConfidence: row.proposedConfidence,
    proposedReason: row.proposedReason,
    currentCoverPath: row.currentCoverPath,
    proposedCoverUrlOrPath: row.proposedCoverUrlOrPath,
  };
}
