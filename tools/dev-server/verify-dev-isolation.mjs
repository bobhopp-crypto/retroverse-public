#!/usr/bin/env node
/**
 * Verify dev server stays up while background jobs run.
 *
 * Usage:
 *   node tools/dev-server/verify-dev-isolation.mjs
 *
 * Prerequisite: npm run dev in a separate terminal.
 */
import { spawn } from "node:child_process";

import { appendDevServerEvent } from "./ownership.mjs";

const BASE = process.env.DEV_VERIFY_URL ?? "http://127.0.0.1:3000/";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probe() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(4000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

function runNpm(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", script, "--", ...args], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function watchDuring(label, jobPromise) {
  let probes = 0;
  let failures = 0;
  const timer = setInterval(async () => {
    probes += 1;
    const ok = await probe();
    if (!ok) {
      failures += 1;
      appendDevServerEvent({
        event: "verify-probe-failed",
        note: `during ${label}`,
        command: label,
      });
      console.error(`[verify] FAIL — dev unreachable during ${label}`);
    }
  }, 2000);

  const code = await jobPromise;
  clearInterval(timer);
  await sleep(500);
  return { code, probes, failures, ok: failures === 0 && (await probe()) };
}

async function main() {
  console.log(`[verify] probing ${BASE}`);
  if (!(await probe())) {
    console.error("[verify] dev server not reachable — start npm run dev first");
    process.exit(1);
  }

  console.log("[verify] running collector --limit 1");
  const collector = await watchDuring(
    "research:collector:overnight --limit 1",
    runNpm("research:collector:overnight", ["--limit", "1"]),
  );
  console.log(
    `[verify] collector exit=${collector.code} probes=${collector.probes} failures=${collector.failures}`,
  );
  if (!collector.ok) process.exit(1);

  console.log("[verify] running studio production --limit 1");
  const production = await watchDuring(
    "research:studio:production --limit 1",
    runNpm("research:studio:production", ["--limit", "1"]),
  );
  console.log(
    `[verify] production exit=${production.code} probes=${production.probes} failures=${production.failures}`,
  );
  if (!production.ok) process.exit(1);

  console.log("[verify] PASS — dev remained available through collector + production");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
