import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type { YearWorkspaceWorkflowAction } from "./types";
import {
  normalizeYearWorkspaceKeywords,
  type YearWorkspaceKeyword,
} from "./vocabulary";

export type YearWorkspaceStateFile = {
  version: 2;
  year: number;
  keywords: Record<string, YearWorkspaceKeyword[]>;
  chartActions: Record<string, YearWorkspaceWorkflowAction>;
  updatedAt: string;
};

type LegacyStateFile = {
  version: 1;
  year: number;
  keywords: Record<string, YearWorkspaceKeyword[]>;
  updatedAt: string;
};

function statePath(year: number): string {
  return join(opsStateDir(), "year-workspace", `${year}.json`);
}

function emptyState(year: number): YearWorkspaceStateFile {
  return {
    version: 2,
    year,
    keywords: {},
    chartActions: {},
    updatedAt: new Date().toISOString(),
  };
}

function migrateKeywords(
  raw: Record<string, unknown> | undefined,
): Record<string, YearWorkspaceKeyword[]> {
  const keywords: Record<string, YearWorkspaceKeyword[]> = {};
  for (const [key, list] of Object.entries(raw ?? {})) {
    if (!Array.isArray(list)) continue;
    keywords[key] = normalizeYearWorkspaceKeywords(list);
  }
  return keywords;
}

export async function loadYearWorkspaceState(
  year: number,
): Promise<YearWorkspaceStateFile> {
  try {
    const raw = await readFile(statePath(year), "utf8");
    const parsed = JSON.parse(raw) as LegacyStateFile | YearWorkspaceStateFile;
    if (parsed?.year !== year) return emptyState(year);

    if (parsed.version === 2) {
      return {
        version: 2,
        year,
        keywords: migrateKeywords(parsed.keywords),
        chartActions: { ...(parsed.chartActions ?? {}) },
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      };
    }

    if (parsed.version === 1) {
      return {
        version: 2,
        year,
        keywords: migrateKeywords(parsed.keywords),
        chartActions: {},
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      };
    }

    return emptyState(year);
  } catch {
    return emptyState(year);
  }
}

async function persistState(state: YearWorkspaceStateFile): Promise<void> {
  const dir = join(opsStateDir(), "year-workspace");
  await mkdir(dir, { recursive: true });
  await writeFile(
    statePath(state.year),
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8",
  );
}

export async function saveYearWorkspaceKeywords(
  year: number,
  workspaceKey: string,
  keywords: YearWorkspaceKeyword[],
): Promise<YearWorkspaceStateFile> {
  const state = await loadYearWorkspaceState(year);
  const normalized = normalizeYearWorkspaceKeywords(keywords);
  if (normalized.length === 0) {
    delete state.keywords[workspaceKey];
  } else {
    state.keywords[workspaceKey] = normalized;
  }
  state.updatedAt = new Date().toISOString();
  await persistState(state);
  return state;
}

export async function saveYearWorkspaceChartAction(
  year: number,
  workspaceKey: string,
  action: YearWorkspaceWorkflowAction | null,
): Promise<YearWorkspaceStateFile> {
  const state = await loadYearWorkspaceState(year);
  if (action == null) {
    delete state.chartActions[workspaceKey];
  } else {
    state.chartActions[workspaceKey] = action;
  }
  state.updatedAt = new Date().toISOString();
  await persistState(state);
  return state;
}

export function keywordsForKey(
  state: YearWorkspaceStateFile,
  workspaceKey: string,
): YearWorkspaceKeyword[] {
  return state.keywords[workspaceKey] ?? [];
}

export function chartActionForKey(
  state: YearWorkspaceStateFile,
  workspaceKey: string,
): YearWorkspaceWorkflowAction | null {
  return state.chartActions[workspaceKey] ?? null;
}
