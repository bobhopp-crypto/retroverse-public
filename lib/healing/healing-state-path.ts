import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export function healingStateDir(): string {
  return join(retroverseDataRoot(), "ops", "healing");
}

export function healingAuditLogPath(): string {
  return join(healingStateDir(), "healing-audit.jsonl");
}
