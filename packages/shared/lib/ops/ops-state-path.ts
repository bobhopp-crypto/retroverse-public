import { join } from "path";

import { retroverseDataRoot } from "@/lib/events/event-data-root";

export function opsStateDir(): string {
  return join(retroverseDataRoot(), "ops");
}

export function opsStateFilePath(): string {
  return join(opsStateDir(), "reconciliation-state.json");
}
