#!/usr/bin/env node
/**
 * Copies the data subsets the Live app reads at runtime into apps/live/data.
 *
 * Vercel packages functions from apps/live and rejects symlinked directories,
 * so the app needs real files at apps/live/data/** for output tracing and for
 * runtime reads (function cwd is apps/live). Local dev runs with cwd at the
 * repo root and reads ./data directly — this copy is only needed for builds.
 *
 * Prepared song heroes are copied as research-department/{ID}/visual-assets/hero-video.jpg
 * using the on-disk directory names (VDJ-{HEX}). Do not hardcode a handful of songs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "apps", "live", "data");

// Live runtime data: attract tour pool + studio publish metadata,
// Sunday Nights snapshots/assets, RVBR era canon + prompt profiles.
const SUBSETS = [
  { source: "data/ops/studio", target: "ops/studio" },
  { source: "data/ops/retroverse-map.json", target: "ops/retroverse-map.json" },
  { source: "data/ops/vdj-rvtr-index.json", target: "ops/vdj-rvtr-index.json" },
  { source: "data/ops/manifest/c2-final-editor-backlog.json", target: "ops/manifest/c2-final-editor-backlog.json" },
  { source: "reports/c2-terra-editor-proof-25/terra-editor-manifest.json", target: "reports/c2-terra-editor-proof-25/terra-editor-manifest.json" },
  { source: "data/sunday-nights", target: "sunday-nights" },
  { source: "data/rvbr", target: "rvbr" },
  { source: "data/album-chart-features.json", target: "album-chart-features.json" },
];

const stat = fs.lstatSync(target, { throwIfNoEntry: false });
if (stat?.isSymbolicLink()) {
  fs.unlinkSync(target);
}
fs.rmSync(target, { recursive: true, force: true });

function copyPreparedHeroes() {
  const srcRoot = path.join(root, "data/ops/intelligence/research-department");
  const destRoot = path.join(target, "ops/intelligence/research-department");
  if (!fs.existsSync(srcRoot)) return 0;
  let copiedHeroes = 0;
  for (const name of fs.readdirSync(srcRoot)) {
    const jpg = path.join(srcRoot, name, "visual-assets", "hero-video.jpg");
    if (!fs.existsSync(jpg) || !fs.statSync(jpg).isFile()) continue;
    const dest = path.join(destRoot, name, "visual-assets", "hero-video.jpg");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(jpg, dest);
    copiedHeroes += 1;
  }
  return copiedHeroes;
}

let copied = 0;
for (const subset of SUBSETS) {
  const src = path.join(root, subset.source);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(target, subset.target);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  copied += 1;
}

const copiedHeroes = copyPreparedHeroes();
console.log(`[prepare-live-data] copied ${copied} data subsets and ${copiedHeroes} hero-video.jpg files into apps/live/data`);
