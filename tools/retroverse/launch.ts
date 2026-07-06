/**
 * RV 00-00 Retroverse — platform entrypoint.
 *
 * Cold-starts BobOS, Live, and the VirtualDJ Bridge, waits for each to be
 * healthy, then opens BobOS in the browser. This is the only thing that can
 * start Retroverse from nothing — BobOS's own Runtime panel (RV 01-02) can
 * only monitor/restart services once BobOS is already running.
 *
 * One profile: Development. Everything starts. No picker, no dialog.
 * Broadcast is application data (playhead state), not a startup dependency.
 *
 * Reuses existing infrastructure — does not reimplement it:
 *  - tools/dev-server/runtime-control.mjs   (start/reuse/health for BobOS + Live)
 *  - tools/dev-server/service-registry.mjs  (ports/health paths — shared with RV 01-02)
 *  - tools/live/shared.ts                   (bridge spawn/manifest, same as `npm run live-now-playing`)
 *
 * Usage: npx --yes tsx tools/retroverse/launch.ts
 *        (or double-click tools/mac/RETROVERSE.command)
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { isBridgeProcessRunning } from "@/lib/sunday-nights/bridge-status";

import { getDevAppStatus, startDevApps } from "../dev-server/runtime-control.mjs";
import { getService } from "../dev-server/service-registry.mjs";
import {
  findProjectRoot,
  liveDataDir,
  loadEnvFiles,
  loadRuntimeConfig,
  openBrowser,
  pidAlive,
  printRemediation,
  readManifest,
  resolveVdjPort,
  sleep,
  spawnDetached,
  statusFail,
  statusOk,
  writeManifest,
  type LiveProcessManifest,
} from "../live/shared";
import { logStartupResult } from "./startup-log.mjs";

const READY_TIMEOUT_MS = 120_000;
const POLL_MS = 1_500;

type AppKey = "studio" | "live";

type StepResult = { ok: boolean; failingService?: string; note?: string };

function appUrl(appKey: AppKey): string {
  const svc = getService(appKey);
  return `http://127.0.0.1:${svc.port}${svc.healthPath ?? "/"}`;
}

async function waitForAppHealthy(appKey: AppKey): Promise<boolean> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await getDevAppStatus(appKey);
    if (status.healthy) return true;
    await sleep(POLL_MS);
  }
  return false;
}

async function startAndWait(appKey: AppKey, label: string): Promise<StepResult> {
  const [result] = await startDevApps([appKey]);

  if (result.action === "blocked") {
    statusFail(`${label} started`, result.reason);
    return { ok: false, failingService: appKey, note: result.reason };
  }

  if (result.action === "reuse") {
    statusOk(`${label} already running`, appUrl(appKey));
    return { ok: true };
  }

  console.log(`Starting ${label}…`);
  const healthy = await waitForAppHealthy(appKey);
  if (!healthy) {
    statusFail(`${label} healthy`, `did not respond within ${READY_TIMEOUT_MS / 1000}s`);
    printRemediation([
      `Check logs/${appKey}.log`,
      `Port ${getService(appKey).port} may be occupied by something unhealthy.`,
    ]);
    return { ok: false, failingService: appKey, note: "health check timeout" };
  }

  statusOk(`${label} healthy`, appUrl(appKey));
  return { ok: true };
}

async function startVdjBridge(projectRoot: string): Promise<StepResult> {
  if (isBridgeProcessRunning()) {
    statusOk("VirtualDJ Bridge already running");
    return { ok: true };
  }

  loadEnvFiles(projectRoot);
  const config = loadRuntimeConfig(projectRoot);
  mkdirSync(liveDataDir(config.dataRoot), { recursive: true });

  const vdjResolved = await resolveVdjPort(config.vdjPort, config.vdjBearer);
  if (!vdjResolved) {
    statusFail(
      "VirtualDJ reachable",
      `OSC not responding on ${config.vdjHost}:${config.vdjPort} — open VirtualDJ to connect`,
    );
    console.log("Continuing — the bridge will pick up VirtualDJ once it's open.");
  } else {
    statusOk("VirtualDJ reachable", `OSC port ${vdjResolved.port}`);
  }
  const vdjPort = vdjResolved?.port ?? config.vdjPort;

  const bridgeLog = join(liveDataDir(config.dataRoot), "bridge-stdout.log");
  const bridge = spawnDetached("npx", ["--yes", "tsx", "tools/live-bridge/index.ts"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      VDJ_OSC_HOST: config.vdjHost,
      VDJ_OSC_PORT: vdjPort,
      VDJ_OSC_BACK_PORT: config.vdjBackPort,
      LIVE_NOW_PLAYING_URL: config.bridgeUrl,
      LIVE_NOW_PLAYING_SECRET: config.apiSecret,
      RETROVERSE_DATA_ROOT: config.dataRoot,
    },
    logPath: bridgeLog,
  });

  const bridgePid = bridge.pid ?? null;
  if (!bridgePid) {
    statusFail("VirtualDJ Bridge started", "failed to spawn");
    return { ok: false, failingService: "vdj-bridge", note: "spawn failed" };
  }

  await sleep(800);
  if (!pidAlive(bridgePid)) {
    statusFail("VirtualDJ Bridge started", "process exited immediately");
    printRemediation([`Check log: ${bridgeLog}`]);
    return { ok: false, failingService: "vdj-bridge", note: "exited immediately" };
  }

  statusOk("VirtualDJ Bridge running", `pid ${bridgePid}`);

  const manifest: LiveProcessManifest = {
    version: 1,
    startedAt: new Date().toISOString(),
    projectRoot,
    port: config.port,
    baseUrl: config.baseUrl,
    vdjPort,
    dev: readManifest(config.dataRoot)?.dev ?? null,
    bridge: { pid: bridgePid, spawned: true },
  };
  writeManifest(config.dataRoot, manifest);

  return { ok: true };
}

async function main() {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  console.log("\nRETROVERSE — starting\n");

  let projectRoot: string;
  try {
    projectRoot = findProjectRoot();
    statusOk("Project root", projectRoot);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    statusFail("Project root", message);
    logStartupResult({
      startedAt,
      durationMs: Date.now() - startMs,
      success: false,
      failingService: "project-root",
      note: message,
    });
    process.exit(1);
  }

  const studioResult = await startAndWait("studio", "BobOS");
  if (!studioResult.ok) {
    logStartupResult({
      startedAt,
      durationMs: Date.now() - startMs,
      success: false,
      failingService: studioResult.failingService,
      note: studioResult.note,
    });
    process.exit(1);
  }

  const liveResult = await startAndWait("live", "Live");
  if (!liveResult.ok) {
    logStartupResult({
      startedAt,
      durationMs: Date.now() - startMs,
      success: false,
      failingService: liveResult.failingService,
      note: liveResult.note,
    });
    process.exit(1);
  }

  const bridgeResult = await startVdjBridge(projectRoot);
  if (!bridgeResult.ok) {
    console.log("BobOS and Live are healthy — continuing without the VirtualDJ Bridge.");
  }

  const studioUrl = appUrl("studio");
  const liveUrl = appUrl("live");

  console.log("\n--- READY ---");
  console.log(`BobOS: ${studioUrl}`);
  console.log(`Live:  ${liveUrl}`);
  console.log(
    `VirtualDJ Bridge: ${bridgeResult.ok ? "running" : "not running — open VirtualDJ, then run npm run vdj-bridge"}\n`,
  );

  openBrowser([studioUrl]);

  logStartupResult({
    startedAt,
    durationMs: Date.now() - startMs,
    success: true,
    note: bridgeResult.ok ? undefined : `vdj-bridge: ${bridgeResult.note ?? "not running"}`,
  });
}

void main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  statusFail("Retroverse startup failed", message);
  logStartupResult({
    startedAt: new Date().toISOString(),
    durationMs: 0,
    success: false,
    note: message,
  });
  process.exit(1);
});
