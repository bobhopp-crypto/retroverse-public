#!/usr/bin/env node
/**
 * Runtime control (RV 01-02) — start/stop Studio and Live dev servers.
 * Wraps tools/next-dev.mjs and dev-server/ownership.mjs (same paths as npm run dev / dev:live).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendDevServerEvent,
  isPortInUse,
  readDevOwnershipForSuffix,
  stopDevServerForSuffix,
} from "./ownership.mjs";
import { getService, healthUrlFor } from "./service-registry.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OWNER = "bobos-runtime";
const DATA_ROOT = process.env.RETROVERSE_DATA_ROOT || path.join(root, "..", "RETROVERSE_DATA");
const MANUAL_LIVE_STOP = path.join(DATA_ROOT, "live", "auto-start-disabled");

// Ports/suffixes/health URLs come from the shared registry (service-registry.json) —
// the same values used by tools/retroverse/launch.ts (RV 00-00) and
// packages/shared/lib/bobos/runtime/dev-control.ts (RV 01-02 status/UI).
export const STUDIO_PORT = getService("studio").port;
export const LIVE_PORT = getService("live").port;
export const STUDIO_SUFFIX = getService("studio").markerSuffix;
export const LIVE_SUFFIX = getService("live").markerSuffix;

const APPS = {
  studio: {
    app: getService("studio").appFlag,
    port: STUDIO_PORT,
    suffix: STUDIO_SUFFIX,
    healthUrl: healthUrlFor("studio"),
  },
  live: {
    app: getService("live").appFlag,
    port: LIVE_PORT,
    suffix: LIVE_SUFFIX,
    healthUrl: healthUrlFor("live"),
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probeHealthy(url) {
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

export async function probeAppHealth(appKey) {
  const config = APPS[appKey];
  return probeHealthy(config.healthUrl);
}

export async function getDevAppStatus(appKey) {
  const config = APPS[appKey];
  const ownership = readDevOwnershipForSuffix(config.suffix);
  const healthy = await probeHealthy(config.healthUrl);
  const portInUse = isPortInUse(config.port);

  let state = "stopped";
  if (healthy) state = "running";
  else if (portInUse) state = "starting";

  return {
    app: appKey,
    state,
    healthy,
    port: config.port,
    url: `localhost:${config.port}`,
    owner: ownership?.owner ?? null,
    startedAt: ownership?.startedAt || null,
    wrapperPid: ownership?.wrapperPid ?? null,
  };
}

async function spawnDevApp(appKey) {
  const config = APPS[appKey];
  const existing = await getDevAppStatus(appKey);

  if (existing.healthy) {
    return { action: "reuse", app: appKey, status: existing };
  }

  if (isPortInUse(config.port) && !existing.healthy) {
    const foreign = readDevOwnershipForSuffix(config.suffix);
    const msg = foreign
      ? `Port ${config.port} in use (owner=${foreign.owner}) but health check failed.`
      : `Port ${config.port} in use but health check failed.`;
    appendDevServerEvent({
      event: "runtime-blocked-port-conflict",
      owner: OWNER,
      port: config.port,
      note: msg,
    });
    return { action: "blocked", app: appKey, reason: msg, status: existing };
  }

  stopDevServerForSuffix(config.suffix);

  // Do NOT pass --no-clean here. Let next-dev.mjs decide: if .next already
  // exists from a previous session, it will clear the stale webpack pack cache
  // before compiling. Passing --no-clean with a day-old pack cache produces
  // stale module IDs that cause "Cannot read properties of undefined (reading
  // 'call')" on the first request.
  const child = spawn(
    "node",
    ["tools/next-dev.mjs", "--app", config.app],
    {
      cwd: root,
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        PORT: String(config.port),
        RETROVERSE_DEV_OWNER: OWNER,
        ...(config.suffix ? { RETROVERSE_DEV_MARKER_SUFFIX: config.suffix } : {}),
      },
    },
  );
  child.unref();

  appendDevServerEvent({
    event: "runtime-start",
    owner: OWNER,
    wrapperPid: child.pid ?? null,
    port: config.port,
    command: `node tools/next-dev.mjs --app ${config.app}`,
    note: `BobOS runtime spawned ${appKey}`,
  });

  return {
    action: "spawned",
    app: appKey,
    pid: child.pid ?? null,
    status: await getDevAppStatus(appKey),
  };
}

export async function startDevApps(appKeys = ["studio", "live"]) {
  if (appKeys.includes("live")) fs.rmSync(MANUAL_LIVE_STOP, { force: true });
  const results = [];
  for (const appKey of appKeys) {
    results.push(await spawnDevApp(appKey));
  }
  return results;
}

export async function stopDevApps(appKeys = ["live", "studio"]) {
  if (appKeys.includes("live")) {
    fs.mkdirSync(path.dirname(MANUAL_LIVE_STOP), { recursive: true });
    fs.writeFileSync(MANUAL_LIVE_STOP, `${new Date().toISOString()}\n`, "utf8");
  }
  const results = [];
  for (const appKey of appKeys) {
    const config = APPS[appKey];
    const stopped = stopDevServerForSuffix(config.suffix);
    appendDevServerEvent({
      event: "runtime-stop",
      owner: OWNER,
      port: config.port,
      note: `${appKey}: ${stopped.reason}${stopped.owner ? ` (was ${stopped.owner})` : ""}`,
    });
    results.push({ app: appKey, ...stopped, status: await getDevAppStatus(appKey) });
  }
  return results;
}

export async function restartDevApps(appKeys = ["studio", "live"]) {
  await stopDevApps(["live", "studio"]);
  await sleep(2_000);
  return startDevApps(appKeys);
}

export async function getDevRuntimeStatus() {
  const [studio, live] = await Promise.all([
    getDevAppStatus("studio"),
    getDevAppStatus("live"),
  ]);
  return { studio, live };
}
