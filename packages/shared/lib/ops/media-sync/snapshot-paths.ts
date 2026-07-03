import { existsSync } from "fs";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

export function vdjInventorySnapshotPath(): string {
  return join(opsStateDir(), "vdj_inventory_snapshot.json");
}

export function r2InventorySnapshotPath(): string {
  return join(opsStateDir(), "r2_inventory_snapshot.json");
}

export function mediaSyncSnapshotStatus(): {
  vdjSnapshotExists: boolean;
  r2SnapshotExists: boolean;
  note: string;
} {
  const vdj = existsSync(vdjInventorySnapshotPath());
  const r2 = existsSync(r2InventorySnapshotPath());
  let note =
    "Live Postgres media_assets (VIDEO-only). Snapshot files not loaded on this pass.";
  if (vdj && r2) {
    note =
      "Snapshot files present on disk; page still uses live Postgres until snapshot loaders are wired.";
  } else if (vdj || r2) {
    note = `Partial snapshots on disk (VDJ: ${vdj ? "yes" : "no"}, R2: ${r2 ? "yes" : "no"}); live Postgres used.`;
  }
  return { vdjSnapshotExists: vdj, r2SnapshotExists: r2, note };
}
