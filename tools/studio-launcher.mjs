#!/usr/bin/env node
/**
 * Studio Launcher — one command dev environment for Retroverse Studio.
 *
 * Usage: npm run studio
 */

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logDir = path.join(root, "logs");
const logFile = path.join(logDir, "studio.log");

const port = process.env.STUDIO_PORT?.trim() || process.env.PORT?.trim() || "3000";
const host = process.env.STUDIO_HOST?.trim() || "localhost";
const studioPath = process.env.STUDIO_PATH?.trim() || "/ops/studio";
const studioUrl =
  process.env.STUDIO_URL?.trim() || `http://${host}:${port}${studioPath}`;
const healthUrl =
  process.env.STUDIO_HEALTH_URL?.trim() || `http://${host}:${port}${studioPath}`;

const readyTimeoutMs = Number(process.env.STUDIO_READY_TIMEOUT_MS ?? 120_000);
const readyPollMs = Number(process.env.STUDIO_READY_POLL_MS ?? 500);
const restartDelayMs = Number(process.env.STUDIO_RESTART_DELAY_MS ?? 2_000);

let shuttingDown = false;
let child = null;
let logStream = null;
let safariOpenedThisSession = false;
let restartCount = 0;

function log(message) {
  const line = `${new Date().toISOString()} ${message}`;
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(logFile, `${line}\n`, "utf8");
  console.log(message);
}

function logCrash(details) {
  const { code, signal, reason } = details;
  const abnormal = code !== 0 || signal != null;
  log(
    `[crash] dev server stopped (code=${code ?? "null"}, signal=${signal ?? "null"}, abnormal=${abnormal})${reason ? ` — ${reason}` : ""}`,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openLogStream() {
  fs.mkdirSync(logDir, { recursive: true });
  if (logStream) logStream.end();
  logStream = fs.createWriteStream(logFile, { flags: "a" });
}

function pipeChildOutput(stream, label) {
  stream.on("data", (chunk) => {
    process.stdout.write(chunk);
    if (logStream?.writable) {
      logStream.write(`[next:${label}] ${chunk}`);
    }
  });
}

function cleanupStaleDevServer() {
  if (child) return;

  try {
    const raw = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!raw) return;

    for (const pidStr of raw.split("\n").filter(Boolean)) {
      const pid = Number(pidStr);
      if (!Number.isFinite(pid)) continue;
      try {
        const cmd = execSync(`ps -p ${pid} -o comm=`, {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        if (/node/i.test(cmd)) {
          log(`[cleanup] stopping stale node listener on port ${port} (pid ${pid})`);
          process.kill(pid, "SIGTERM");
        }
      } catch {
        /* process already gone */
      }
    }
  } catch {
    /* port free */
  }
}

async function waitForServer(url, { signal }) {
  const deadline = Date.now() + readyTimeoutMs;

  while (Date.now() < deadline) {
    if (signal.aborted) return false;

    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(4_000),
        headers: { Accept: "text/html" },
      });
      if (res.status < 500) return true;
    } catch (err) {
      if (signal.aborted) return false;
      if (err?.name === "AbortError") return false;
    }

    await sleep(readyPollMs);
  }

  return false;
}

function openSafari(url) {
  if (safariOpenedThisSession) return;

  if (process.platform !== "darwin") {
    log(`[open] Safari auto-open skipped (platform=${process.platform}). Open ${url}`);
    safariOpenedThisSession = true;
    return;
  }

  const opener = spawn("open", ["-a", "Safari", url], {
    cwd: root,
    stdio: "ignore",
    detached: true,
  });
  opener.unref();
  safariOpenedThisSession = true;
  log(`[open] Safari → ${url}`);
}

function spawnDevServer() {
  return new Promise((resolve) => {
    const abort = new AbortController();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      abort.abort();
      resolve(result);
    };

    restartCount += 1;
    log(`[start] launching dev server on port ${port} (attempt ${restartCount})`);

    child = spawn("node", ["tools/next-dev.mjs"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: port,
        HOSTNAME: host,
        RETROVERSE_DEV_NO_CLEAN: "1",
      },
    });

    if (child.stdout) pipeChildOutput(child.stdout, "stdout");
    if (child.stderr) pipeChildOutput(child.stderr, "stderr");

    child.on("error", (err) => {
      logCrash({ code: 1, signal: null, reason: err.message });
      finish({ code: 1, signal: null });
    });

    child.on("close", (code, signal) => {
      child = null;
      finish({ code: code ?? 1, signal: signal ?? null });
    });

    void (async () => {
      const ready = await waitForServer(healthUrl, { signal: abort.signal });
      if (settled || abort.signal.aborted) return;

      if (ready) {
        log(`[ready] server responding at ${healthUrl}`);
        openSafari(studioUrl);
        return;
      }

      log(`[warn] server did not become ready within ${readyTimeoutMs}ms`);
      if (child && !shuttingDown) {
        log("[warn] killing unready dev server child");
        child.kill("SIGTERM");
      }
    })();
  });
}

function stopChild() {
  if (!child) return;
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
}

async function main() {
  openLogStream();
  log("[studio] launcher started");
  log(`[studio] log file: ${logFile}`);
  log(`[studio] target: ${studioUrl}`);

  cleanupStaleDevServer();

  while (!shuttingDown) {
    const result = await spawnDevServer();

    if (shuttingDown) break;

    logCrash(result);

    log(`[restart] waiting ${restartDelayMs}ms before relaunch…`);
    await sleep(restartDelayMs);
    cleanupStaleDevServer();
  }

  log("[studio] launcher stopped");
  if (logStream) logStream.end();
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`[studio] received ${sig}, shutting down…`);
    stopChild();
  });
}

main().catch((err) => {
  log(`[fatal] ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
