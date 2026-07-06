import "server-only";

import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { DevAppStatus, RuntimeServiceState } from "./types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
import SERVICE_REGISTRY from "../../../../../tools/dev-server/service-registry.json";

export const VDJ_BRIDGE_COMMAND = SERVICE_REGISTRY["vdj-bridge"].hintCommand;
export const STUDIO_PORT = SERVICE_REGISTRY.studio.port;
export const LIVE_PORT = SERVICE_REGISTRY.live.port;
export const LIVE_HEALTH_URL = `http://127.0.0.1:${LIVE_PORT}${SERVICE_REGISTRY.live.healthPath}`;

type DevOwnership = {
  owner: string;
  wrapperPid: number;
  port: number;
  startedAt: string;
  childPid: number | null;
};

export function repoRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "tools/dev-server/ownership.mjs"))) return cwd;
  const parent = path.join(cwd, "..");
  if (fs.existsSync(path.join(parent, "tools/dev-server/ownership.mjs"))) return parent;
  return cwd;
}

export function readDevOwnershipForSuffix(suffix = ""): DevOwnership | null {
  const marker = path.join(repoRoot(), `.retroverse-dev-active${suffix}`);
  if (!fs.existsSync(marker)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(marker, "utf8")) as Record<string, unknown>;
    return {
      owner: String(raw.owner ?? "unknown"),
      wrapperPid: Number(raw.wrapperPid ?? raw.pid),
      port: Number(raw.port ?? STUDIO_PORT),
      startedAt: String(raw.startedAt ?? ""),
      childPid: raw.childPid != null ? Number(raw.childPid) : null,
    };
  } catch {
    return null;
  }
}

function isPortInUse(port: number): boolean {
  if (process.platform === "win32") return false;
  try {
    const raw = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return raw.length > 0;
  } catch {
    return false;
  }
}

async function probeHealthy(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(4_000),
      headers: { Accept: "text/html" },
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

export function studioAppStatus(ownership: DevOwnership | null, studioPort = STUDIO_PORT): DevAppStatus {
  return {
    app: "studio",
    state: "running",
    healthy: true,
    port: studioPort,
    url: `localhost:${studioPort}`,
    owner: ownership?.owner ?? null,
    startedAt: ownership?.startedAt || null,
    wrapperPid: ownership?.wrapperPid ?? null,
  };
}

export async function liveAppStatus(
  ownership: DevOwnership | null,
  liveHealthUrl = LIVE_HEALTH_URL,
  livePort = LIVE_PORT,
): Promise<DevAppStatus> {
  const healthy = await probeHealthy(liveHealthUrl);
  const portInUse = isPortInUse(livePort);

  let state: RuntimeServiceState = "stopped";
  if (healthy) state = "running";
  else if (portInUse) state = "starting";

  return {
    app: "live",
    state,
    healthy,
    port: livePort,
    url: `localhost:${livePort}`,
    owner: ownership?.owner ?? null,
    startedAt: ownership?.startedAt || null,
    wrapperPid: ownership?.wrapperPid ?? null,
  };
}

export function spawnDetachedLifecycle(command: "start" | "stop" | "restart") {
  const script = path.join(repoRoot(), "tools/dev-server/runtime-lifecycle.mjs");
  const child = spawn("node", [script, command], {
    cwd: repoRoot(),
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}
