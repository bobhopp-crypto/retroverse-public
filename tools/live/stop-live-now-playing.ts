/**
 * Stop live-now-playing spawned processes.
 *
 *   npm run live-stop
 */
import {
  clearManifest,
  findProjectRoot,
  killPid,
  loadEnvFiles,
  loadRuntimeConfig,
  pidAlive,
  readManifest,
  statusFail,
  statusOk,
} from "./shared";

function main() {
  console.log("\nRetroverse Live Now Playing — shutdown\n");

  let projectRoot: string;
  try {
    projectRoot = findProjectRoot();
  } catch (err) {
    statusFail("Project root", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  loadEnvFiles(projectRoot);
  const config = loadRuntimeConfig(projectRoot);
  const manifest = readManifest(config.dataRoot);

  if (!manifest) {
    statusOk("Nothing to stop", "no live session manifest found");
    process.exit(0);
  }

  let stopped = 0;

  if (manifest.bridge?.spawned && pidAlive(manifest.bridge.pid)) {
    if (killPid(manifest.bridge.pid, "bridge")) {
      statusOk("Bridge stopped", `pid ${manifest.bridge.pid}`);
      stopped += 1;
    }
  } else if (manifest.bridge) {
    statusOk("Bridge already stopped");
  }

  if (manifest.dev?.spawned) {
    if (pidAlive(manifest.dev.pid)) {
      if (killPid(manifest.dev.pid, "dev server")) {
        statusOk("Dev server stopped", `pid ${manifest.dev.pid}`);
        stopped += 1;
      }
    } else {
      statusOk("Dev server process already stopped");
    }
  } else if (manifest.dev) {
    statusOk("Dev server left running", "was not started by live-now-playing");
  }

  clearManifest(config.dataRoot);

  if (stopped === 0) {
    console.log("\nNo running spawned processes found.\n");
  } else {
    console.log(`\nStopped ${stopped} process(es).\n`);
  }
}

main();
