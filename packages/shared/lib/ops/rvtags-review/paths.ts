import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

export function pilotCsvPath(year: number): string {
  return join(process.cwd(), "docs", "ops", `${year}-vdj-rvtags-pilot.csv`);
}

export function reviewedCsvPath(year: number): string {
  return join(opsStateDir(), "rvtags-review", `reviewed-rvtags-${year}.csv`);
}
