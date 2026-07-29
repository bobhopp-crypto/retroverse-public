#!/usr/bin/env node
/**
 * Copies the data subsets the Live app reads at runtime into apps/live/data.
 *
 * Vercel packages functions from apps/live and rejects symlinked directories,
 * so the app needs real files at apps/live/data/** for output tracing and for
 * runtime reads (function cwd is apps/live). Local dev runs with cwd at the
 * repo root and reads ./data directly — this copy is only needed for builds.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "apps", "live", "data");

// Live runtime data: attract tour pool + studio publish metadata,
// Sunday Nights snapshots/assets, RVBR era canon + prompt profiles.
const SUBSETS = [
  "ops/studio",
  "ops/retroverse-map.json",
  "ops/vdj-rvtr-index.json",
  "sunday-nights",
  "rvbr",
  "album-chart-features.json",
];

const stat = fs.lstatSync(target, { throwIfNoEntry: false });
if (stat?.isSymbolicLink()) {
  fs.unlinkSync(target);
}
fs.rmSync(target, { recursive: true, force: true });

let copied = 0;
for (const subset of SUBSETS) {
  const src = path.join(root, "data", subset);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(target, subset);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  copied += 1;
}

console.log(`[prepare-live-data] copied ${copied} data subsets into apps/live/data`);
