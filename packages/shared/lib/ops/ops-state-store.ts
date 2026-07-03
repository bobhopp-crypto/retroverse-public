import { mkdir, readFile, writeFile } from "fs/promises";

import type { AcquisitionStatus, MatchStatus } from "@/lib/ops/reconciliation-model";
import { opsStateDir, opsStateFilePath } from "@/lib/ops/ops-state-path";

export type OpsMatchOverride = {
  chartItemId: string;
  graphTrackId: number;
  mediaId: number | null;
  manualOverride: boolean;
  matchStatus: MatchStatus;
  bestMatch: string | null;
  notes: string | null;
  updatedAt: string;
};

export type OpsAcquisitionRecord = {
  id: string;
  chartItemId: string;
  graphTrackId: number | null;
  artist: string;
  title: string;
  year: number;
  status: AcquisitionStatus;
  peak: number | null;
  createdAt: string;
  updatedAt: string;
};

export type OpsStateActivity = {
  id: string;
  ts: string;
  entity: string;
  action: string;
  source: string;
  status: "ok" | "warn" | "error";
};

export type OpsReconciliationState = {
  version: 1;
  matchOverrides: Record<string, OpsMatchOverride>;
  acquisitions: Record<string, OpsAcquisitionRecord>;
  activity: OpsStateActivity[];
};

function emptyState(): OpsReconciliationState {
  return {
    version: 1,
    matchOverrides: {},
    acquisitions: {},
    activity: [],
  };
}

export async function loadOpsState(): Promise<OpsReconciliationState> {
  try {
    const raw = await readFile(opsStateFilePath(), "utf8");
    const parsed = JSON.parse(raw) as OpsReconciliationState;
    if (parsed?.version !== 1) return emptyState();
    return {
      version: 1,
      matchOverrides: parsed.matchOverrides ?? {},
      acquisitions: parsed.acquisitions ?? {},
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
    };
  } catch {
    return emptyState();
  }
}

export async function saveOpsState(state: OpsReconciliationState): Promise<void> {
  await mkdir(opsStateDir(), { recursive: true });
  await writeFile(opsStateFilePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function appendOpsActivity(
  state: OpsReconciliationState,
  entry: Omit<OpsStateActivity, "id" | "ts">,
): void {
  const row: OpsStateActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString().replace("T", " ").slice(0, 19),
    ...entry,
  };
  state.activity = [row, ...state.activity].slice(0, 40);
}
