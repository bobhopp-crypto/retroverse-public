import { readFile } from "node:fs/promises";

import { healingAuditLogPath } from "@/lib/healing/healing-state-path";
import type { HealingAuditEntry } from "@/lib/healing/types";

/** Read append-only healing audit JSONL (empty if missing). */
export async function readHealingAuditLog(): Promise<HealingAuditEntry[]> {
  try {
    const raw = await readFile(healingAuditLogPath(), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as HealingAuditEntry);
  } catch {
    return [];
  }
}
