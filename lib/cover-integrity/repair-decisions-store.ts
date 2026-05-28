import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export type CoverRepairDecisionValue = "approve" | "reject" | "skip";

export type CoverRepairDecision = {
  rval: string;
  decision: CoverRepairDecisionValue;
  curatorNotes: string;
  reviewedAt: string;
  proposedSource: string;
  proposedCoverUrlOrPath: string;
};

export type CoverRepairDecisionsFile = {
  version: 1;
  batchId: "repair_batch_001";
  updatedAt: string;
  decisions: Record<string, CoverRepairDecision>;
};

export function repairDecisionsPath(root = process.cwd()): string {
  const override = process.env.REPAIR_BATCH_DECISIONS_PATH?.trim();
  if (override) return override;
  return join(root, "reports/cover_integrity/repair_batch_001_decisions.json");
}

export async function loadRepairDecisions(): Promise<CoverRepairDecisionsFile> {
  const path = repairDecisionsPath();
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as CoverRepairDecisionsFile;
    if (parsed?.decisions && typeof parsed.decisions === "object") {
      return parsed;
    }
  } catch {
    // missing file
  }
  return {
    version: 1,
    batchId: "repair_batch_001",
    updatedAt: new Date().toISOString(),
    decisions: {},
  };
}

export async function saveRepairDecision(
  decision: CoverRepairDecision,
): Promise<CoverRepairDecisionsFile> {
  const state = await loadRepairDecisions();
  state.decisions[decision.rval.toUpperCase()] = {
    ...decision,
    rval: decision.rval.toUpperCase(),
  };
  state.updatedAt = new Date().toISOString();

  const path = repairDecisionsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2));

  return state;
}
