/**
 * Live now playing diagnostics.
 *
 *   npm run live-diagnose
 */
import {
  findProjectRoot,
  loadEnvFiles,
  loadRuntimeConfig,
  pidAlive,
  probeApi,
  readManifest,
  resolveVdjPort,
  statusFail,
  statusOk,
} from "./shared";

type LivePayload = {
  live?: {
    artist?: string;
    title?: string;
    rvtr?: string | null;
    deck?: number;
    filepath?: string;
    resolution?: string;
    source?: string;
  } | null;
  updatedAt?: string;
};

async function main() {
  console.log("\nRetroverse Live Now Playing — diagnose\n");

  let projectRoot: string;
  try {
    projectRoot = findProjectRoot();
    console.log(`Project path: ${projectRoot}`);
  } catch (err) {
    statusFail("Project root", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  loadEnvFiles(projectRoot);
  const config = loadRuntimeConfig(projectRoot);

  console.log(`Data root:    ${config.dataRoot}`);
  console.log(`Base URL:     ${config.baseUrl}`);
  console.log(`Bridge URL:   ${config.bridgeUrl}`);
  console.log(`Current API:  ${config.currentApiUrl}`);
  console.log(`VDJ port:     ${config.vdjPort}`);

  const manifest = readManifest(config.dataRoot);
  if (manifest) {
    console.log(`\nSession started: ${manifest.startedAt}`);
    if (manifest.dev) {
      const alive = pidAlive(manifest.dev.pid);
      console.log(
        `Dev server:   pid ${manifest.dev.pid} ${alive ? "(running)" : "(stopped)"} spawned=${manifest.dev.spawned}`,
      );
    }
    if (manifest.bridge) {
      const alive = pidAlive(manifest.bridge.pid);
      console.log(
        `Bridge:       pid ${manifest.bridge.pid} ${alive ? "(running)" : "(stopped)"} spawned=${manifest.bridge.spawned}`,
      );
    }
  } else {
    console.log("\nNo active live session manifest.");
  }

  console.log("");

  const vdjResolved = await resolveVdjPort(config.vdjPort, config.vdjBearer);
  if (vdjResolved) {
    const note = vdjResolved.discovered ? " (auto-discovered)" : "";
    statusOk("VDJ connectivity", `port ${vdjResolved.port}${note}`);
  } else {
    statusFail("VDJ connectivity", `port ${config.vdjPort} (+ fallbacks)`);
    console.log("  → Enable Network Control in VirtualDJ");
  }

  const api = await probeApi(config.currentApiUrl);
  if (api.ok) statusOk("API status", `HTTP ${api.status}`);
  else statusFail("API status", api.body ?? `HTTP ${api.status}`);

  if (api.ok) {
    try {
      const full = await fetch(config.currentApiUrl, { cache: "no-store" });
      const data = (await full.json()) as LivePayload;
      const live = data.live;
      if (live?.title) {
        console.log("\nCurrent live track (authoritative):");
        console.log(`  ${live.artist} — ${live.title}`);
        console.log(`  RVTR: ${live.rvtr ?? "—"} (${live.resolution ?? "?"})`);
        console.log(`  Source: ${live.source ?? "—"}`);
        console.log(`  Deck: ${live.deck ?? "—"}`);
        console.log(`  Updated: ${data.updatedAt ?? "—"}`);
        if (live.filepath) console.log(`  Path: ${live.filepath}`);
      } else {
        console.log("\nCurrent live track: (none)");
      }
    } catch {
      /* ignore parse errors */
    }
  }

  const bridgeRunning = manifest?.bridge ? pidAlive(manifest.bridge.pid) : false;
  if (bridgeRunning) statusOk("Bridge status", "running");
  else statusFail("Bridge status", "not running — run npm run live-now-playing");

  console.log("");
}

void main();
