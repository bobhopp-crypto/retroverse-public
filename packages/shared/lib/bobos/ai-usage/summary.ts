import type { AiUsageEntry } from "./types";

export type AiUsageSummary = {
  todaySpend: number;
  monthSpend: number;
  totalSpend: number;
  providerSpend: Record<string, number>;
  workflowSpend: Record<string, number>;
  localFreeCount: number;
};

const LOCAL_FREE_PROVIDERS = new Set(["Ollama", "ComfyUI"]);

function isSameDay(dateStr: string, ref: Date): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function isSameMonth(dateStr: string, ref: Date): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function addTo(map: Record<string, number>, key: string, amount: number) {
  map[key] = (map[key] ?? 0) + amount;
}

export function computeAiUsageSummary(entries: AiUsageEntry[], now: Date = new Date()): AiUsageSummary {
  const summary: AiUsageSummary = {
    todaySpend: 0,
    monthSpend: 0,
    totalSpend: 0,
    providerSpend: {},
    workflowSpend: {},
    localFreeCount: 0,
  };

  for (const entry of entries) {
    const cost = Number.isFinite(entry.costDollars) ? entry.costDollars : 0;
    summary.totalSpend += cost;
    if (isSameDay(entry.date, now)) summary.todaySpend += cost;
    if (isSameMonth(entry.date, now)) summary.monthSpend += cost;
    addTo(summary.providerSpend, entry.provider, cost);
    addTo(summary.workflowSpend, entry.workflow, cost);
    if (cost === 0 || LOCAL_FREE_PROVIDERS.has(entry.provider)) summary.localFreeCount += 1;
  }

  return summary;
}

export function topEntriesBySpend(spend: Record<string, number>, limit = 5): { key: string; total: number }[] {
  return Object.entries(spend)
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
