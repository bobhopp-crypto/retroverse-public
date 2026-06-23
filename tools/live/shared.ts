import { spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { probeOscConnectivity } from "../live-bridge/osc-sensor";
import { readVdjOscSettings } from "../live-bridge/osc-settings";

const LIVE_DIR_NAME = "live";

export type LiveProcessManifest = {
  version: 1;
  startedAt: string;
  projectRoot: string;
  port: number;
  baseUrl: string;
  vdjPort: string;
  dev: { pid: number; spawned: boolean } | null;
  bridge: { pid: number; spawned: boolean } | null;
};

export type LiveRuntimeConfig = {
  projectRoot: string;
  port: number;
  baseUrl: string;
  /** Bridge POST target. */
  bridgeUrl: string;
  /** Public live state GET (readiness probe). */
  currentApiUrl: string;
  vdjHost: string;
  vdjPort: string;
  vdjBackPort: string;
  vdjBearer: string;
  apiSecret: string;
  dataRoot: string;
  opsPin: string;
};

export function loadEnvFiles(projectRoot: string): void {
  for (const name of [".env.local", ".env"]) {
    const path = join(projectRoot, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

export function findProjectRoot(): string {
  const candidates = [process.cwd(), dirname(fileURLToPath(import.meta.url))];

  for (const start of candidates) {
    let dir = resolve(start);
    for (let i = 0; i < 10; i++) {
      const pkgPath = join(dir, "package.json");
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
          if (pkg.name === "retroverse-public") return dir;
        } catch {
          /* try parent */
        }
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  throw new Error(
    "Retroverse project root not found. cd into RETROVERSE_PUBLIC and run npm run live-now-playing",
  );
}

export function liveDataDir(dataRoot: string): string {
  return join(dataRoot, LIVE_DIR_NAME);
}

export function manifestPath(dataRoot: string): string {
  return join(liveDataDir(dataRoot), "processes.json");
}

export function readManifest(dataRoot: string): LiveProcessManifest | null {
  const path = manifestPath(dataRoot);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LiveProcessManifest;
  } catch {
    return null;
  }
}

export function writeManifest(dataRoot: string, manifest: LiveProcessManifest): void {
  const dir = liveDataDir(dataRoot);
  mkdirSync(dir, { recursive: true });
  writeFileSync(manifestPath(dataRoot), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export function clearManifest(dataRoot: string): void {
  const path = manifestPath(dataRoot);
  if (existsSync(path)) unlinkSync(path);
}

export function pidAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function killPid(pid: number, label: string): boolean {
  if (!pidAlive(pid)) return false;
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch (err) {
    console.error(`Failed to stop ${label} (pid ${pid}):`, err);
    return false;
  }
}

export function loadRuntimeConfig(projectRoot: string): LiveRuntimeConfig {
  const oscSettings = readVdjOscSettings();
  const port = Number(process.env.PORT ?? process.env.LIVE_PORT ?? "3000") || 3000;
  const explicitBridgeUrl = process.env.LIVE_NOW_PLAYING_URL?.trim();
  const baseUrl =
    process.env.LIVE_BASE_URL?.trim() ||
    (explicitBridgeUrl ? new URL(explicitBridgeUrl).origin : `http://127.0.0.1:${port}`);
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const bridgeUrl =
    explicitBridgeUrl ||
    `${normalizedBase}/api/sunday-nights/bridge`;
  const currentApiUrl =
    process.env.LIVE_CURRENT_API_URL?.trim() ||
    bridgeUrl.replace(/\/api\/sunday-nights\/bridge$/, "/api/sunday-nights/current");

  const siblingData = join(projectRoot, "..", "RETROVERSE_DATA");
  const dataRoot =
    process.env.RETROVERSE_DATA_ROOT?.trim() ||
    (existsSync(siblingData) ? siblingData : siblingData);

  return {
    projectRoot,
    port,
    baseUrl: normalizedBase,
    bridgeUrl,
    currentApiUrl,
    vdjHost: process.env.VDJ_OSC_HOST?.trim() || "127.0.0.1",
    vdjPort: process.env.VDJ_OSC_PORT?.trim() || String(oscSettings.oscPort),
    vdjBackPort: process.env.VDJ_OSC_BACK_PORT?.trim() || String(oscSettings.oscPortBack),
    vdjBearer: process.env.VDJ_NETWORK_BEARER?.trim() || "",
    apiSecret: process.env.LIVE_NOW_PLAYING_SECRET?.trim() || "",
    dataRoot,
    opsPin: process.env.RETROVERSE_OPS_PIN?.trim() || "6324",
  };
}

export async function waitForHttpOk(
  url: string,
  timeoutMs = 120_000,
  intervalMs = 1500,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await sleep(intervalMs);
  }
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function probeApi(apiUrl: string): Promise<{ ok: boolean; status: number; body?: string }> {
  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();

    if (!res.ok) {
      return { ok: false, status: res.status, body: body.slice(0, 200) };
    }

    if (!contentType.includes("json") && !body.trimStart().startsWith("{")) {
      return {
        ok: false,
        status: res.status,
        body: "endpoint returned HTML — wrong server or route missing on this port",
      };
    }

    try {
      const parsed = JSON.parse(body) as { updatedAt?: unknown; live?: unknown };
      if (typeof parsed.updatedAt !== "string") {
        return { ok: false, status: res.status, body: "unexpected API payload" };
      }
    } catch {
      return { ok: false, status: res.status, body: "invalid JSON from API" };
    }

    return { ok: true, status: res.status, body: body.slice(0, 200) };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

export async function probeVdjPort(port: string, bearer: string): Promise<boolean> {
  void bearer;
  const settings = readVdjOscSettings();
  return probeOscConnectivity({
    host: process.env.VDJ_OSC_HOST?.trim() || "127.0.0.1",
    vdjPort: Number(port) || settings.oscPort,
    listenPort: Number(process.env.VDJ_OSC_BACK_PORT ?? settings.oscPortBack) || settings.oscPortBack,
  });
}

/** Probe configured VirtualDJ OSC port. */
export async function resolveVdjPort(
  configured: string,
  bearer: string,
): Promise<{ port: string; discovered: boolean } | null> {
  if (await probeVdjPort(configured, bearer)) {
    return { port: configured, discovered: false };
  }

  return null;
}

export function spawnDetached(
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    logPath: string;
  },
): ChildProcess {
  mkdirSync(dirname(options.logPath), { recursive: true });
  const out = openSync(options.logPath, "a");

  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.unref();
  return child;
}

export function openBrowser(urls: string[]): void {
  if (process.platform !== "darwin") {
    for (const url of urls) console.log(`Open: ${url}`);
    return;
  }
  for (const url of urls) {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

export function statusOk(label: string, detail?: string): void {
  console.log(`✅ ${label}${detail ? ` — ${detail}` : ""}`);
}

export function statusFail(label: string, detail?: string): void {
  console.log(`❌ ${label}${detail ? ` — ${detail}` : ""}`);
}

export function printRemediation(lines: string[]): void {
  console.log("\nRemediation:");
  for (const line of lines) console.log(`  • ${line}`);
}
