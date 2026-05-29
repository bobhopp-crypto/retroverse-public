import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import {
  normalizeYearWorkspaceKeywords,
  type YearWorkspaceKeyword,
} from "./vocabulary";

export type YearWorkspaceStateFile = {
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
    version: 1,
    year,
    keywords: {},
    updatedAt: new Date().toISOString(),
  };
}

export async function loadYearWorkspaceState(
  year: number,
): Promise<YearWorkspaceStateFile> {
  try {
    const raw = await readFile(statePath(year), "utf8");
    const parsed = JSON.parse(raw) as YearWorkspaceStateFile;
    if (parsed?.version !== 1 || parsed.year !== year) return emptyState(year);
    const keywords: Record<string, YearWorkspaceKeyword[]> = {};
    for (const [key, list] of Object.entries(parsed.keywords ?? {})) {
      if (!Array.isArray(list)) continue;
      keywords[key] = normalizeYearWorkspaceKeywords(list);
    }
    return {
      version: 1,
      year,
      keywords,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyState(year);
  }
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

  const dir = join(opsStateDir(), "year-workspace");
  await mkdir(dir, { recursive: true });
  await writeFile(statePath(year), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

export function keywordsForKey(
  state: YearWorkspaceStateFile,
  workspaceKey: string,
): YearWorkspaceKeyword[] {
  return state.keywords[workspaceKey] ?? [];
}
