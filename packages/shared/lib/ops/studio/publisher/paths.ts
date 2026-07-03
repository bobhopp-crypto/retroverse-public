import { join } from "path";

import { bundledIntelligenceRoot } from "@/lib/ops/intelligence/paths";

/** Central publisher registry — not a new on-disk package artifact per RVTR. */
export function publisherStorePath(): string {
  return join(bundledIntelligenceRoot(), "..", "studio", "publisher-records.json");
}
