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

import {
  appendDevServerEvent,
  clearDevOwnership,
  isPortInUse,
  pidAlive,
  readDevOwnership,
  writeDevOwnership,
} from "./dev-server/ownership.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");
const cacheDir = path.join(root, "node_modules", ".cache");
const productionMarker = path.join(nextDir, ".production-build");

const argv = process.argv.slice(2);
const noClean =
  argv.includes("--no-clean") || process.env.RETROVERSE_DEV_NO_CLEAN === "1";
const forceClean =
  argv.includes("--clean") || process.env.RETROVERSE_DEV_CLEAN === "1";
const owner = process.env.RETROVERSE_DEV_OWNER?.trim() || "npm-dev";

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

function forwardArgs() {
  const skip = new Set(["--clean", "--no-clean"]);
  return argv.filter((a) => !skip.has(a));
}

const port = process.env.PORT?.trim() || "3000";

const existing = readDevOwnership();
if (isPortInUse(Number(port))) {
  const foreignAlive = existing?.wrapperPid && pidAlive(existing.wrapperPid);
  if (foreignAlive && existing.wrapperPid !== process.pid) {
    console.error(
      `[dev] Port ${port} already in use (owner=${existing.owner}, pid=${existing.wrapperPid}).`,
    );
    console.error("[dev] Stop the existing dev server first — will not kill foreign processes.");
    process.exit(1);
  }
  if (!foreignAlive) {
    console.error(
      `[dev] Port ${port} is already in use by another process. Free the port before starting dev.`,
    );
    process.exit(1);
  }
}

if (shouldClean()) {
  cleanCaches();
}

writeDevOwnership({
  owner,
  wrapperPid: process.pid,
  childPid: null,
  port: Number(port),
  startedAt: new Date().toISOString(),
});

const nextBin =
  process.platform === "win32"
    ? path.join(root, "node_modules", ".bin", "next.cmd")
    : path.join(root, "node_modules", ".bin", "next");

const nextArgs = ["dev", "-p", port, ...forwardArgs()];
const hostname = process.env.HOSTNAME?.trim();
if (hostname) {
  nextArgs.push("-H", hostname);
}

const stackPreload = path.join(root, "tools", "dev-stack-trace-preload.cjs");
const existingNodeOptions = process.env.NODE_OPTIONS?.trim() ?? "";
const preloadFlag = `--require ${stackPreload}`;
const nodeOptions = existingNodeOptions.includes(stackPreload)
  ? existingNodeOptions
  : [existingNodeOptions, preloadFlag].filter(Boolean).join(" ");

const child = spawn(nextBin, nextArgs, {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
    RETROVERSE_GALLERY_TRACE: process.env.RETROVERSE_GALLERY_TRACE ?? "1",
  },
});

writeDevOwnership({
  owner,
  wrapperPid: process.pid,
  childPid: child.pid ?? null,
  port: Number(port),
  startedAt: new Date().toISOString(),
});

function shutdown(code, signal) {
  appendDevServerEvent({
    event: signal ? "dev-exit-signal" : "dev-exit",
    owner,
    wrapperPid: process.pid,
    childPid: child.pid ?? null,
    port: Number(port),
    exitCode: code ?? null,
    signal: signal ?? null,
    command: `node tools/next-dev.mjs (${owner})`,
    note: signal ? "wrapper received shutdown" : "next child exited",
  });
  clearDevOwnership();
  process.exit(code ?? child.exitCode ?? 0);
}

child.on("error", (err) => {
  appendDevServerEvent({
    event: "dev-spawn-error",
    owner,
    wrapperPid: process.pid,
    port: Number(port),
    note: err.message,
    command: nextArgs.join(" "),
  });
  console.error("[dev] Failed to start Next.js:", err.message);
  shutdown(1);
});

child.on("close", (code, signal) => {
  if (signal) {
    appendDevServerEvent({
      event: "dev-child-signal",
      owner,
      wrapperPid: process.pid,
      childPid: child.pid ?? null,
      port: Number(port),
      exitCode: code ?? null,
      signal,
      command: nextArgs.join(" "),
    });
    clearDevOwnership();
    process.exit(code ?? 1);
  }
  shutdown(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    child.kill(sig);
  });
}
