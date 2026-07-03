import { appendFile, mkdir } from "node:fs/promises";

import {
  healingAuditLogPath,
  healingStateDir,
} from "@/lib/healing/healing-state-path";
import type { HealingAuditEntry } from "@/lib/healing/types";

export async function appendHealingAudit(
  entry: Omit<HealingAuditEntry, "ts"> & { ts?: string },
): Promise<HealingAuditEntry> {
  const row: HealingAuditEntry = {
    ...entry,
    ts: entry.ts ?? new Date().toISOString(),
  };
  await mkdir(healingStateDir(), { recursive: true });
  await appendFile(healingAuditLogPath(), `${JSON.stringify(row)}\n`, "utf8");
  return row;
}
