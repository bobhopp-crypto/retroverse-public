import { existsSync } from "node:fs";
import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export function rv12OpsDir(): string {
  return join(retroverseDataRoot(), "ops", "rv12");
}

export function rv12AssetsLogPath(): string {
  return join(rv12OpsDir(), "rv12_assets.jsonl");
}

export function rvalAssignmentsLogPath(): string {
  return join(rv12OpsDir(), "rval_assignments.jsonl");
}

export function promotionAuditLogPath(): string {
  return join(rv12OpsDir(), "promotion_audit.jsonl");
}

export function rv12StagingDir(): string {
  return join(rv12OpsDir(), "staging");
}

export function rv12BackupsDir(): string {
  return join(rv12OpsDir(), "backups");
}

export function stagingPathForRv12(rv12Id: string, ext = "jpg"): string {
  return join(rv12StagingDir(), `${rv12Id}.${ext}`);
}

/** Pilot-only promotion targets for this pass. */
export const RV12_PILOT_RVALS = new Set(["RVAL823723"]);

export function isPilotRval(rval: string): boolean {
  return RV12_PILOT_RVALS.has(rval.trim().toUpperCase());
}
