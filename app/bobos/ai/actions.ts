"use server";

import { randomUUID } from "crypto";

import { parseAiUsageCsv } from "@/lib/bobos/ai-usage/csv";
import { appendAiUsageEntries } from "@/lib/bobos/ai-usage/store";
import type { AiUsageEntry, NewAiUsageEntryInput } from "@/lib/bobos/ai-usage/types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("BobOS AI Usage is localhost-only.");
  }
}

function toEntry(input: NewAiUsageEntryInput): AiUsageEntry {
  return {
    id: randomUUID(),
    date: input.date,
    provider: input.provider,
    tool: input.tool.trim(),
    workflow: input.workflow,
    mode: input.mode.trim(),
    costDollars: Number.isFinite(input.costDollars) ? input.costDollars : 0,
    creditsUsed: Number.isFinite(input.creditsUsed) ? input.creditsUsed : 0,
    notes: input.notes.trim(),
    outcome: input.outcome.trim(),
    createdAt: new Date().toISOString(),
  };
}

export async function addAiUsageEntry(input: NewAiUsageEntryInput): Promise<AiUsageEntry[]> {
  assertLocalStudio();
  if (!input.date) throw new Error("Date is required.");
  return appendAiUsageEntries([toEntry(input)]);
}

export type ImportAiUsageCsvResult = {
  entries: AiUsageEntry[];
  imported: number;
  skipped: number;
};

export async function importAiUsageCsv(csvText: string): Promise<ImportAiUsageCsvResult> {
  assertLocalStudio();
  const { entries: parsed, skipped } = parseAiUsageCsv(csvText);
  if (parsed.length === 0) {
    return { entries: await appendAiUsageEntries([]), imported: 0, skipped };
  }
  const entries = await appendAiUsageEntries(parsed.map(toEntry));
  return { entries, imported: parsed.length, skipped };
}
