/**
 * One-command Sunday Nights live startup.
 *
 *   npm run live-now-playing
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  findProjectRoot,
  killPid,
  liveDataDir,
  loadEnvFiles,
  loadRuntimeConfig,
  openBrowser,
  pidAlive,
  printRemediation,
  probeApi,
  readManifest,
  resolveVdjPort,
  spawnDetached,
  statusFail,
  statusOk,
  waitForHttpOk,
  writeManifest,
  type LiveProcessManifest,
} from "./shared";

async function main() {
  console.log("\nRetroverse Live Now Playing — startup\n");

  let projectRoot: string;
  try {
    projectRoot = findProjectRoot();
    statusOk("Project root", projectRoot);
  } catch (err) {
    statusFail("Project root", err instanceof Error ? err.message : String(err));
    printRemediation([
      "cd /path/to/RETROVERSE_PUBLIC",
      "Run: npm run live-now-playing",
    ]);
    process.exit(1);
  }

  loadEnvFiles(projectRoot);
  process.env.RETROVERSE_OPS = process.env.RETROVERSE_OPS ?? "1";

  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) {
    statusFail("package.json", "not found");
    process.exit(1);
  }
  statusOk("package.json found");

  const config = loadRuntimeConfig(projectRoot);
  mkdirSafe(liveDataDir(config.dataRoot));

  // Stop stale processes we previously spawned
  const existing = readManifest(config.dataRoot);
  if (existing?.bridge?.spawned && pidAlive(existing.bridge.pid)) {
    killPid(existing.bridge.pid, "bridge");
  }
  if (existing?.dev?.spawned && pidAlive(existing.dev.pid)) {
    killPid(existing.dev.pid, "dev server");
  }

  // --- VDJ preflight ---
  let vdjPort = config.vdjPort;
  const vdjResolved = await resolveVdjPort(config.vdjPort, config.vdjBearer);
  if (!vdjResolved) {
    statusFail(
      "VDJ reachable",
      `OSC not responding on ${config.vdjHost}:${config.vdjPort} → listen ${config.vdjBackPort}`,
    );
    console.log("Continuing startup; the bridge will verify deck data from OSC.");
    vdjPort = config.vdjPort;
  } else {
    vdjPort = vdjResolved.port;
    statusOk("VDJ reachable", `OSC port ${vdjPort}`);
  }

  // --- Retroverse dev server ---
  let devSpawned = false;
  let devPid: number | null = null;

  const apiProbe = await probeApi(config.currentApiUrl);
  if (apiProbe.ok) {
    statusOk("Retroverse running", config.baseUrl);
  } else {
    console.log("Starting Retroverse dev server…");
    const devLog = join(liveDataDir(config.dataRoot), "dev-stdout.log");
    const child = spawnDetached("node", ["tools/next-dev.mjs"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PORT: String(config.port),
        RETROVERSE_OPS: "1",
        RETROVERSE_DATA_ROOT: config.dataRoot,
        RETROVERSE_DEV_OWNER: "live-now-playing",
      },
      logPath: devLog,
    });
    devSpawned = true;
    devPid = child.pid ?? null;

    const ready = await waitForHttpOk(config.currentApiUrl, 120_000);
    if (!ready) {
      statusFail("Retroverse running", `API did not become ready at ${config.currentApiUrl}`);
      if (devPid) killPid(devPid, "dev server");
      printRemediation([
        `Check log: ${devLog}`,
        "Port conflict? Set LIVE_PORT=3001 in .env.local",
        "Run: npm run live-diagnose",
      ]);
      process.exit(1);
    }
    statusOk("Retroverse running", `${config.baseUrl} (started)`);
  }

  // --- Bridge ---
  const bridgeLog = join(liveDataDir(config.dataRoot), "bridge-stdout.log");
  const bridge = spawnDetached(
    "npx",
    ["--yes", "tsx", "tools/live-bridge/index.ts"],
    {
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
    },
  );

  const bridgePid = bridge.pid ?? null;
  if (!bridgePid) {
    statusFail("Bridge running", "failed to spawn");
    if (devSpawned && devPid) killPid(devPid, "dev server");
    process.exit(1);
  }

  await sleepBrief();
  if (!pidAlive(bridgePid)) {
    statusFail("Bridge running", "process exited immediately");
    printRemediation([`Check log: ${bridgeLog}`]);
    if (devSpawned && devPid) killPid(devPid, "dev server");
    process.exit(1);
  }
  statusOk("Bridge running", `pid ${bridgePid}`);

  // --- Live page ---
  const livePageOk = await waitForHttpOk(`${config.baseUrl}/live`, 30_000, 1000);
  if (livePageOk) {
    statusOk("Live page ready", `${config.baseUrl}/live`);
  } else {
    statusFail("Live page ready", `${config.baseUrl}/live not responding yet`);
  }

  const manifest: LiveProcessManifest = {
    version: 1,
    startedAt: new Date().toISOString(),
    projectRoot,
    port: config.port,
    baseUrl: config.baseUrl,
    vdjPort,
    dev: devPid ? { pid: devPid, spawned: devSpawned } : null,
    bridge: { pid: bridgePid, spawned: true },
  };
  writeManifest(config.dataRoot, manifest);

  console.log("\n--- Ready ---");
  console.log(`Patron page:  ${config.baseUrl}/live`);
  console.log(`Ops monitor:  ${config.baseUrl}/ops/live  (PIN: ${config.opsPin})`);
  console.log(`Bridge log:   ${bridgeLog}`);
  console.log(`Stop all:     npm run live-stop\n`);

  openBrowser([`${config.baseUrl}/live`, `${config.baseUrl}/ops/live`]);
}

function mkdirSafe(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function sleepBrief(): Promise<void> {
  return new Promise((r) => setTimeout(r, 800));
}

void main().catch((err) => {
  statusFail("Startup failed", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
