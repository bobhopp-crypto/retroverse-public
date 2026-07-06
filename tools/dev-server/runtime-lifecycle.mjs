#!/usr/bin/env node
/**
 * Detached Runtime (RV 01-02) lifecycle — stop/restart without blocking BobOS.
 * Used when Studio must stop itself (Stop / Restart from the Runtime widget).
 */
import { restartDevApps, startDevApps, stopDevApps } from "./runtime-control.mjs";

const command = process.argv[2];

async function main() {
  if (command === "start") {
    await startDevApps(["studio", "live"]);
    return;
  }
  if (command === "stop") {
    await stopDevApps(["live", "studio"]);
    return;
  }
  if (command === "restart") {
    await restartDevApps(["studio", "live"]);
    return;
  }
  console.error(`Usage: node tools/dev-server/runtime-lifecycle.mjs <start|stop|restart>`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
