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
  { source: "data/bobos/song-packages", target: "bobos/song-packages" },
  { source: "data/bobos/visual-assets", target: "bobos/visual-assets" },
  { source: "data/bobos/presentation-assets/woodstock", target: "bobos/presentation-assets/woodstock" },
  { source: "data/ops/studio", target: "ops/studio" },
  { source: "data/ops/retroverse-map.json", target: "ops/retroverse-map.json" },
  { source: "data/ops/vdj-rvtr-index.json", target: "ops/vdj-rvtr-index.json" },
  { source: "data/ops/intelligence/editorial-diversity-25.json", target: "ops/intelligence/editorial-diversity-25.json" },
  { source: "data/ops/intelligence/live-story-pilot-overrides.json", target: "ops/intelligence/live-story-pilot-overrides.json" },
  { source: "reports/song-preparation-pilot-25/preparation-manifest.json", target: "reports/song-preparation-pilot-25/preparation-manifest.json" },
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

function verifyWoodstockSnapshot() {
  const snapshot = path.join(target, "bobos/presentation-assets/woodstock");
  const indexPath = path.join(snapshot, "index.json");
  if (!fs.existsSync(indexPath)) throw new Error("[prepare-live-data] Woodstock presentation snapshot is missing");
  const assets = JSON.parse(fs.readFileSync(indexPath, "utf8")).assets;
  if (!Array.isArray(assets) || assets.length !== 12) throw new Error(`[prepare-live-data] expected 12 Woodstock records, found ${assets?.length ?? 0}`);
  let slides = 0;
  for (const asset of assets) {
    const identity = String(asset.vdjIdentity ?? "");
    if (!/^VDJ:[0-9A-F]{16}$/i.test(identity)) throw new Error(`[prepare-live-data] invalid Woodstock VDJ identity: ${identity}`);
    const heroDir = `VDJ-${identity.slice(4).toLowerCase()}`;
    const heroPath = path.join(snapshot, heroDir, String(asset.hero?.file ?? ""));
    if (!fs.existsSync(heroPath)) throw new Error(`[prepare-live-data] missing Woodstock hero: ${heroPath}`);
    slides += Array.isArray(asset.slides) ? asset.slides.length : 0;
    const serialized = JSON.stringify(asset);
    if (serialized.includes("/Users/") || serialized.includes("file://")) throw new Error(`[prepare-live-data] local path exposed in Woodstock record: ${identity}`);
  }
  if (slides !== 24) throw new Error(`[prepare-live-data] expected 24 Woodstock slides, found ${slides}`);
  console.log(`[prepare-live-data] verified Woodstock snapshot: ${assets.length} records, ${slides} slides`);
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
verifyWoodstockSnapshot();
const pilotOverride = path.join(target, "ops", "intelligence", "live-story-pilot-overrides.json");
if (!fs.existsSync(pilotOverride)) {
  throw new Error(`[prepare-live-data] required live-story pilot data was not copied: ${pilotOverride}`);
}
const pilotRecords = JSON.parse(fs.readFileSync(pilotOverride, "utf8")).records;
if (!pilotRecords.some((record) => String(record.rvtr).toUpperCase() === "RVTR185152")) {
  throw new Error("[prepare-live-data] required RVTR185152 pilot override is missing");
}
console.log(`[prepare-live-data] copied ${copied} data subsets and ${copiedHeroes} hero-video.jpg files into apps/live/data`);
console.log("[prepare-live-data] verified RVTR185152 pilot override in prepared runtime data");
