/**
 * Collector paths — re-exported from Studio Kernel.
 * Collector-only paths remain here.
 */

import { join } from "path";

export {
  researchDepartmentRoot,
  collectorSongDir,
  collectorOutputPath,
  collectorTempDir,
  collectorVisualAssetsDir,
  collectorProgressPath,
} from "@/lib/studio/package";

export function collectorPilotReportPath(): string {
  return join(process.cwd(), "reports", "research-department", "COLLECTOR-PILOT.md");
}
