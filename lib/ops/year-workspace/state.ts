import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { migrateReviews, type YearReviewRecord } from "./review-types";
import type { YearWorkspaceWorkflowAction } from "./types";
import {
  normalizeYearWorkspaceKeywords,
  type YearWorkspaceKeyword,
} from "./vocabulary";

export type YearWorkspaceStateFile = {
  version: 3;
  year: number;
  keywords: Record<string, YearWorkspaceKeyword[]>;
  chartActions: Record<string, YearWorkspaceWorkflowAction>;
  reviews: Record<string, YearReviewRecord>;
  updatedAt: string;
};

type LegacyStateFileV1 = {
  version: 1;
  year: number;
  keywords: Record<string, YearWorkspaceKeyword[]>;
  updatedAt: string;
};

type LegacyStateFileV2 = {
  version: 2;
  year: number;
  keywords: Record<string, YearWorkspaceKeyword[]>;
  chartActions: Record<string, YearWorkspaceWorkflowAction>;
  updatedAt: string;
};

type ParsedStateFile =
  | LegacyStateFileV1
  | LegacyStateFileV2
  | YearWorkspaceStateFile
  | (Record<string, unknown> & { version?: number; year?: number });

function statePath(year: number): string {
  return join(opsStateDir(), "year-workspace", `${year}.json`);
}

function emptyState(year: number): YearWorkspaceStateFile {
  return {
    version: 3,
    year,
    keywords: {},
    chartActions: {},
    reviews: {},
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

function toV3(
  year: number,
  keywords: Record<string, YearWorkspaceKeyword[]>,
  chartActions: Record<string, YearWorkspaceWorkflowAction>,
  reviews: Record<string, YearReviewRecord>,
  updatedAt: string | undefined,
): YearWorkspaceStateFile {
  return {
    version: 3,
    year,
    keywords,
    chartActions,
    reviews,
    updatedAt: updatedAt ?? new Date().toISOString(),
  };
}

export function migrateParsedState(parsed: ParsedStateFile, year: number): YearWorkspaceStateFile {
  if (parsed?.year !== year) return emptyState(year);

  if (parsed.version === 3) {
    const v3 = parsed as YearWorkspaceStateFile;
    return toV3(
      year,
      migrateKeywords(v3.keywords as Record<string, unknown>),
      { ...(v3.chartActions ?? {}) },
      migrateReviews(v3.reviews as Record<string, unknown>),
      v3.updatedAt,
    );
  }

  if (parsed.version === 2) {
    const v2 = parsed as LegacyStateFileV2;
    return toV3(
      year,
      migrateKeywords(v2.keywords as Record<string, unknown>),
      { ...(v2.chartActions ?? {}) },
      {},
      v2.updatedAt,
    );
  }

  if (parsed.version === 1) {
    const v1 = parsed as LegacyStateFileV1;
    return toV3(
      year,
      migrateKeywords(v1.keywords as Record<string, unknown>),
      {},
      {},
      v1.updatedAt,
    );
  }

  return emptyState(year);
}

export async function loadYearWorkspaceState(
  year: number,
): Promise<YearWorkspaceStateFile> {
  try {
    const raw = await readFile(statePath(year), "utf8");
    const parsed = JSON.parse(raw) as ParsedStateFile;
    const state = migrateParsedState(parsed, year);

    if (parsed.version !== 3) {
      await persistYearWorkspaceState(state);
    }

    return state;
  } catch {
    return emptyState(year);
  }
}

export async function persistYearWorkspaceState(
  state: YearWorkspaceStateFile,
): Promise<void> {
  const dir = join(opsStateDir(), "year-workspace");
  await mkdir(dir, { recursive: true });
  await writeFile(
    statePath(state.year),
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8",
  );
}

async function persistState(state: YearWorkspaceStateFile): Promise<void> {
  await persistYearWorkspaceState(state);
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
