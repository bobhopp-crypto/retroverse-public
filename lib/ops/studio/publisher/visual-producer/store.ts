import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { visualProductionPath } from "./paths";
import type { VisualProductionPlan } from "./types";

export async function loadVisualProduction(rvtr: string): Promise<VisualProductionPlan | null> {
  try {
    const raw = await readFile(visualProductionPath(rvtr), "utf8");
    return JSON.parse(raw) as VisualProductionPlan;
  } catch {
    return null;
  }
}

export async function saveVisualProduction(plan: VisualProductionPlan): Promise<void> {
  const path = visualProductionPath(plan.rvtr);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}
