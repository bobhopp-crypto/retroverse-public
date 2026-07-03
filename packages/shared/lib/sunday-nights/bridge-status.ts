import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export type BridgeProcessManifest = {
  version: 1;
  startedAt: string;
  projectRoot: string;
  port: number;
  baseUrl: string;
  vdjPort: string;
  dev: { pid: number; spawned: boolean } | null;
  bridge: { pid: number; spawned: boolean } | null;
};

function manifestPath(): string {
  return join(retroverseDataRoot(), "live", "processes.json");
}

export function loadBridgeProcessManifest(): BridgeProcessManifest | null {
  const path = manifestPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as BridgeProcessManifest;
  } catch {
    return null;
  }
}

export function isBridgeProcessRunning(): boolean {
  const manifest = loadBridgeProcessManifest();
  if (!manifest?.bridge?.pid) return false;
  try {
    process.kill(manifest.bridge.pid, 0);
    return true;
  } catch {
    return false;
  }
}
