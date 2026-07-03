import { readFile } from "fs/promises";
import { join } from "path";

export type IntelligenceCoverHold = {
  active: boolean;
  reason: string;
  since: string;
  reportPath: string;
};

const HOLD_PATH = join(process.cwd(), "reports/intelligence/cover-integrity-hold.json");

export async function loadIntelligenceCoverHold(): Promise<IntelligenceCoverHold | null> {
  try {
    const raw = await readFile(HOLD_PATH, "utf8");
    return JSON.parse(raw) as IntelligenceCoverHold;
  } catch {
    return null;
  }
}

export async function assertIntelligenceNotBlocked(context: string): Promise<void> {
  const hold = await loadIntelligenceCoverHold();
  if (hold?.active) {
    throw new Error(
      `${context} blocked: ${hold.reason} (since ${hold.since}). See ${hold.reportPath}`,
    );
  }
}
