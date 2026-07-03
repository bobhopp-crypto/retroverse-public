#!/usr/bin/env node
/**
 * Fail build if any route exports maxDuration outside Vercel Hobby limits (1–300s).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDirs = [
  path.join(root, "apps", "live", "app"),
  path.join(root, "apps", "studio", "app"),
].filter((dir) => fs.existsSync(dir));
const MIN = 1;
const MAX = 300;

const pattern = /export\s+const\s+maxDuration\s*=\s*(\d+)/g;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/route\.(t|j)sx?$/.test(name) || name === "route.ts" || name === "route.js") out.push(full);
  }
  return out;
}

const violations = [];

for (const file of appDirs.flatMap((dir) => walk(dir))) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(pattern)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value < MIN || value > MAX) {
      violations.push({ file: path.relative(root, file), value });
    }
  }
}

if (violations.length) {
  console.error("[verify-max-duration] Invalid maxDuration values (Hobby plan: 1–300 seconds):");
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.value}`);
  }
  process.exit(1);
}

console.log("[verify-max-duration] OK — all route maxDuration values within 1–300s");
