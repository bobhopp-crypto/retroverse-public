import { appendFile, mkdir } from "node:fs/promises";

import { healingStateDir } from "@/lib/healing/healing-state-path";

export type MbIngestAuditAction = "stage" | "approve" | "apply" | "rollback" | "reject";

export type MbIngestAuditEntry = {
  ts: string;
  action: MbIngestAuditAction;
  batchName: string;
  rvtr: string;
  proposalId?: number;
  proposedRval?: string;
  mbReleaseId?: string;
  actor: string;
  ok: boolean;
  message: string;
  signals?: string[];
};

export function mbIngestAuditLogPath(): string {
  return `${healingStateDir()}/mb-ingest-audit.jsonl`;
}

export async function appendMbIngestAudit(
  entry: Omit<MbIngestAuditEntry, "ts"> & { ts?: string },
): Promise<MbIngestAuditEntry> {
  const row: MbIngestAuditEntry = {
    ...entry,
    ts: entry.ts ?? new Date().toISOString(),
  };
  await mkdir(healingStateDir(), { recursive: true });
  await appendFile(mbIngestAuditLogPath(), `${JSON.stringify(row)}\n`, "utf8");
  return row;
}
