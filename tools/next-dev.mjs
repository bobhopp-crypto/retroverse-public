#!/usr/bin/env node
/**
 * Stable Next.js dev launcher.
 * Clears stale webpack chunks before start (fixes "Cannot find module './NNN.js'").
 * Use RETROVERSE_DEV_NO_CLEAN=1 or --no-clean for a faster restart when cache is trusted.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");
const cacheDir = path.join(root, "node_modules", ".cache");
const devMarker = path.join(root, ".retroverse-dev-active");
const productionMarker = path.join(nextDir, ".production-build");

const argv = process.argv.slice(2);
const noClean =
  argv.includes("--no-clean") || process.env.RETROVERSE_DEV_NO_CLEAN === "1";
const forceClean =
  argv.includes("--clean") || process.env.RETROVERSE_DEV_CLEAN === "1";

function rmSafe(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function shouldClean() {
  if (fs.existsSync(productionMarker)) return true;
  if (noClean && !forceClean) return false;
  if (forceClean) return true;
  if (fs.existsSync(nextDir)) return true;
  return false;
}

function cleanCaches() {
  console.log("[dev] Clearing stale .next and bundler cache…");
  rmSafe(nextDir);
  rmSafe(cacheDir);
}

function writeDevMarker() {
  fs.writeFileSync(
    devMarker,
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    "utf8",
  );
}

function removeDevMarker() {
  try {
    fs.unlinkSync(devMarker);
  } catch {
    /* ignore */
  }
}

function forwardArgs() {
  const skip = new Set(["--clean", "--no-clean"]);
  return argv.filter((a) => !skip.has(a));
}

if (shouldClean()) {
  cleanCaches();
}

writeDevMarker();

const nextBin =
  process.platform === "win32"
    ? path.join(root, "node_modules", ".bin", "next.cmd")
    : path.join(root, "node_modules", ".bin", "next");

const port = process.env.PORT?.trim() || "3000";
const nextArgs = ["dev", "-p", port, ...forwardArgs()];
const hostname = process.env.HOSTNAME?.trim();
if (hostname) {
  nextArgs.push("-H", hostname);
}

const child = spawn(nextBin, nextArgs, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

function shutdown(code) {
  removeDevMarker();
  process.exit(code ?? child.exitCode ?? 0);
}

child.on("error", (err) => {
  console.error("[dev] Failed to start Next.js:", err.message);
  shutdown(1);
});

child.on("close", (code, signal) => {
  if (signal) {
    removeDevMarker();
    process.exit(code ?? 1);
  }
  shutdown(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    child.kill(sig);
  });
}
