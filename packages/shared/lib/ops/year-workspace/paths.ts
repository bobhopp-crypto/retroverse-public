import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type { YearWorkspaceCategoryId } from "./types";

/** Scoped workspace root: `ops/year-workspace/{year}` */
export function yearWorkspaceDir(year: number): string {
  return join(opsStateDir(), "year-workspace", String(year));
}

export function yearSourcesDir(year: number): string {
  return join(yearWorkspaceDir(year), "sources");
}

export function categorySourcesPath(
  year: number,
  category: YearWorkspaceCategoryId,
): string {
  return join(yearSourcesDir(year), `${category}.json`);
}

/** Logical incoming path for dropped assets (no file move yet). */
export function logicalIncomingPath(
  year: number,
  category: YearWorkspaceCategoryId,
  filename: string,
): string {
  return join("ops", "year-workspace", String(year), "incoming", category, filename);
}
