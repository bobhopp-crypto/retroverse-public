#!/usr/bin/env node
/**
 * Blocks `next build` while a local dev server is active (stale chunk desync).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const devMarker = path.join(root, ".retroverse-dev-active");
const port = process.env.PORT?.trim() || "3000";

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

if (fs.existsSync(devMarker)) {
  try {
    const raw = JSON.parse(fs.readFileSync(devMarker, "utf8"));
    const pid = typeof raw.wrapperPid === "number" ? raw.wrapperPid : raw.pid;
    if (typeof pid === "number" && pidAlive(pid)) {
      console.error(
        `[build] Dev launcher still active (pid ${pid}, owner=${raw.owner ?? "unknown"}). Stop npm run dev before npm run build.`,
      );
      process.exit(1);
    }
  } catch {
    /* stale or corrupt marker */
  }
}

try {
  const pids = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (pids) {
    console.error(
      `[build] Port ${port} is in use (pid ${pids.replace(/\n/g, ", ")}). Stop the dev server before npm run build.`,
    );
    process.exit(1);
  }
} catch {
  /* nothing listening */
}
