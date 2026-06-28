import { join } from "path";

import { collectorSongDir } from "@/lib/studio/package";

export function visualProductionPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "visual-production.json");
}
