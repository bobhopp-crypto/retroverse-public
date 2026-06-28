#!/usr/bin/env node
/**
 * Studio Launcher — one command dev environment for Retroverse Studio.
 *
 * Usage: npm run studio
 */

import { spawn } from "node:child_process";
import {
  appendDevServerEvent,
  isPortInUse,
  readDevOwnership,
  releaseOwnedDevServer,
} from "./dev-server/ownership.mjs";
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
let lastExitAbnormal = false;

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

/** Reuse a healthy foreign dev server — never kill arbitrary port listeners. */
async function resolveDevAvailability() {
  if (await probeHealthy(healthUrl)) {
    const foreign = readDevOwnership();
    log(
      `[reuse] dev already healthy at ${healthUrl}${foreign ? ` (owner=${foreign.owner}, pid=${foreign.wrapperPid})` : ""}`,
    );
    return { mode: "reuse" };
  }

  if (isPortInUse(Number(port))) {
    const foreign = readDevOwnership();
    const msg = foreign
      ? `Port ${port} in use by owner=${foreign.owner} pid=${foreign.wrapperPid} but health check failed.`
      : `Port ${port} in use but health check failed.`;
    log(`[blocked] ${msg}`);
    appendDevServerEvent({
      event: "studio-blocked-port-conflict",
      owner: "studio-launcher",
      note: msg,
      port: Number(port),
    });
    return { mode: "blocked", reason: msg };
  }

  releaseOwnedDevServer("studio-launcher");
  return { mode: "spawn" };
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
  return new Promise(async (resolve) => {
    const availability = await resolveDevAvailability();
    if (availability.mode === "reuse") {
      openSafari(studioUrl);
      return resolve({ code: 0, signal: null, reused: true });
    }
    if (availability.mode === "blocked") {
      return resolve({ code: 1, signal: null, blocked: true });
    }

    const abort = new AbortController();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      abort.abort();
      resolve(result);
    };

    restartCount += 1;
    const shouldClean = restartCount === 1 || lastExitAbnormal;
    log(
      `[start] launching dev server on port ${port} (attempt ${restartCount}, cache=${shouldClean ? "clean" : "reuse"})`,
    );

    child = spawn("node", ["tools/next-dev.mjs"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: port,
        HOSTNAME: host,
        RETROVERSE_DEV_OWNER: "studio-launcher",
        ...(shouldClean
          ? { RETROVERSE_DEV_CLEAN: "1" }
          : { RETROVERSE_DEV_NO_CLEAN: "1" }),
      },
    });

    if (child.stdout) pipeChildOutput(child.stdout, "stdout");
    if (child.stderr) pipeChildOutput(child.stderr, "stderr");

    child.on("error", (err) => {
      logCrash({ code: 1, signal: null, reason: err.message });
      finish({ code: 1, signal: null });
    });

    child.on("close", (code, signal) => {
      lastExitAbnormal = code !== 0 || signal != null;
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
  releaseOwnedDevServer("studio-launcher");
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

  while (!shuttingDown) {
    const result = await spawnDevServer();

    if (result.reused) {
      log("[studio] using existing dev server — launcher idle (Ctrl+C to exit)");
      await new Promise((resolve) => {
        const onSig = () => resolve();
        process.once("SIGINT", onSig);
        process.once("SIGTERM", onSig);
      });
      break;
    }

    if (result.blocked) {
      log("[studio] cannot start — resolve port conflict manually");
      break;
    }

    if (shuttingDown) break;

    logCrash(result);

    log(`[restart] waiting ${restartDelayMs}ms before relaunch…`);
    await sleep(restartDelayMs);
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
