import { AI_USAGE_PROVIDERS, AI_USAGE_WORKFLOWS, type AiUsageProvider, type AiUsageWorkflow, type NewAiUsageEntryInput } from "./types";

const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  provider: "provider",
  "model/tool": "tool",
  model: "tool",
  tool: "tool",
  workflow: "workflow",
  mode: "mode",
  "cost dollars": "costDollars",
  cost: "costDollars",
  costdollars: "costDollars",
  "credits used": "creditsUsed",
  credits: "creditsUsed",
  creditsused: "creditsUsed",
  notes: "notes",
  outcome: "outcome",
};

function normalizeHeader(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? null;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function coerceProvider(value: string): AiUsageProvider {
  const match = AI_USAGE_PROVIDERS.find((p) => p.toLowerCase() === value.trim().toLowerCase());
  return match ?? "Other";
}

function coerceWorkflow(value: string): AiUsageWorkflow {
  const match = AI_USAGE_WORKFLOWS.find((w) => w.toLowerCase() === value.trim().toLowerCase());
  return match ?? "Other";
}

export type ParsedAiUsageCsv = {
  entries: NewAiUsageEntryInput[];
  skipped: number;
};

/** Header row required. Unknown columns ignored; missing optional fields default empty. */
export function parseAiUsageCsv(text: string): ParsedAiUsageCsv {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return { entries: [], skipped: 0 };

  const headerCells = splitCsvLine(lines[0]!).map(normalizeHeader);
  const entries: NewAiUsageEntryInput[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headerCells.forEach((key, index) => {
      if (key) row[key] = cells[index] ?? "";
    });

    const date = row.date?.trim();
    if (!date) {
      skipped += 1;
      continue;
    }

    entries.push({
      date,
      provider: coerceProvider(row.provider ?? ""),
      tool: row.tool?.trim() ?? "",
      workflow: coerceWorkflow(row.workflow ?? ""),
      mode: row.mode?.trim() ?? "",
      costDollars: Number.parseFloat(row.costDollars ?? "") || 0,
      creditsUsed: Number.parseFloat(row.creditsUsed ?? "") || 0,
      notes: row.notes?.trim() ?? "",
      outcome: row.outcome?.trim() ?? "",
    });
  }

  return { entries, skipped };
}
