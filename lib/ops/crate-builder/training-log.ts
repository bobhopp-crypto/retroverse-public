import { appendFile, mkdir } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

export type CrateMoveLogEntry = {
  ts: string;
  year: number;
  songKey: string;
  artist: string;
  title: string;
  /** null = unsorted pool */
  fromSetId: string | null;
  toSetId: string | null;
};

function logPath(year: number): string {
  return join(opsStateDir(), "crate-builder", "training", `${year}.jsonl`);
}

export async function appendCrateMoveLog(entry: CrateMoveLogEntry): Promise<void> {
  const dir = join(opsStateDir(), "crate-builder", "training");
  await mkdir(dir, { recursive: true });
  await appendFile(logPath(entry.year), `${JSON.stringify(entry)}\n`, "utf8");
}
