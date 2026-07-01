import "server-only";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";

import type { FinanceAttentionSummary } from "./types";

export async function readFinanceAttentionSummary(): Promise<FinanceAttentionSummary | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  try {
    await ensureFinanceSchema();
    const [count, latestRows] = await Promise.all([
      countImportsNeedingAttention(),
      inspectQuery<{ file_name: string; created_at: string | Date }>(
        `SELECT file_name, created_at
         FROM finance_imports
         WHERE posted_at IS NULL
           AND workflow_status IN ('uploaded', 'parsed', 'reviewed', 'reconciled')
           AND source NOT IN ('amazon')
         ORDER BY created_at DESC
         LIMIT 1`,
      ),
    ]);

    const latest = latestRows[0];
    return {
      count,
      latestLabel: latest?.file_name?.trim() || null,
      latestCreatedAt: latest?.created_at
        ? latest.created_at instanceof Date
          ? latest.created_at.toISOString()
          : new Date(latest.created_at).toISOString()
        : null,
    };
  } catch {
    return null;
  }
}
