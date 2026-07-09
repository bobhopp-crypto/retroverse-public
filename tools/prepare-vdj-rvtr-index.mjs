#!/usr/bin/env node
/**
 * Build a compact RVTR → VDJ metadata index for broadcast package fallback.
 *
 * Production serverless cannot read database.xml at runtime. This index is
 * generated at build time (when VirtualDJ is available) and copied into
 * apps/live/data for the now-playing-package API.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RVTR_RE = /^RVTR\d{6}$/i;
const LABEL_RVTR_RE = /RVTR\d{6}/i;

function retroverseDataRoot() {
  const fromEnv = process.env.RETROVERSE_DATA_ROOT?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const sibling = path.join(root, "..", "RETROVERSE_DATA");
  if (fs.existsSync(sibling)) return sibling;
  return fromEnv || sibling;
}

function vdjDatabasePath() {
  return (
    process.env.RETROVERSE_VDJ_DATABASE?.trim() ||
    path.join(os.homedir(), "Library/Application Support/VirtualDJ/database.xml")
  );
}

function decodeXmlAttr(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readAttr(block, name) {
  const re = new RegExp(`\\s${name}="([^"]*)"`);
  const m = block.match(re);
  return m?.[1] ? decodeXmlAttr(m[1]) : "";
}

function rvtrFromLabel(label) {
  const m = label.match(LABEL_RVTR_RE);
  return m?.[0]?.toUpperCase() ?? null;
}

function scanVdjDatabase() {
  const dbPath = vdjDatabasePath();
  if (!fs.existsSync(dbPath)) {
    return { path: dbPath, entries: [] };
  }

  const xml = fs.readFileSync(dbPath, "utf8");
  const entries = [];
  const songRe = /<Song\s+FilePath="([^"]*)"[^>]*>([\s\S]*?)<\/Song>/g;
  let m;
  while ((m = songRe.exec(xml)) !== null) {
    const inner = m[2] ?? "";
    const tagsMatch = inner.match(/<Tags([^>]*)\/?>/);
    const infosMatch = inner.match(/<Infos([^>]*)\/?>/);
    const tagsAttrs = tagsMatch?.[1] ?? "";
    const infosAttrs = infosMatch?.[1] ?? "";
    const yearRaw = readAttr(tagsAttrs, "Year");
    const yearNum = Number(yearRaw);
    const year = Number.isFinite(yearNum) && yearNum > 0 ? yearNum : null;
    const playRaw = readAttr(infosAttrs, "PlayCount");
    const playCount = playRaw ? Number(playRaw) : null;

    entries.push({
      artist: readAttr(tagsAttrs, "Author"),
      title: readAttr(tagsAttrs, "Title"),
      album: readAttr(tagsAttrs, "Album"),
      year,
      label: readAttr(tagsAttrs, "Label"),
      playCount: Number.isFinite(playCount) ? playCount : null,
    });
  }

  return { path: dbPath, entries };
}

function bundledPackageRvtrs() {
  const dirs = [
    path.join(root, "data", "ops", "intelligence", "packages"),
    path.join(retroverseDataRoot(), "ops", "intelligence", "packages"),
  ];
  const out = new Set();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const rvtr = name.slice(0, -5).toUpperCase();
      if (RVTR_RE.test(rvtr)) out.add(rvtr);
    }
  }
  return out;
}

function entryScore(entry) {
  let score = 0;
  if (entry.artist.trim()) score += 10;
  if (entry.title.trim()) score += 10;
  if (entry.album?.trim()) score += 5;
  if (entry.year) score += 2;
  score += Math.min(entry.playCount ?? 0, 100);
  return score;
}

function pickBestEntry(current, next) {
  if (!current) return next;
  return entryScore(next) > entryScore(current) ? next : current;
}

/**
 * @returns {{ indexPath: string, entryCount: number, vdjPath: string, skippedExisting: number }}
 */
export function prepareVdjRvtrIndex() {
  const indexPath = path.join(root, "data", "ops", "vdj-rvtr-index.json");
  const existingPackages = bundledPackageRvtrs();
  const vdj = scanVdjDatabase();

  const entries = {};
  let skippedExisting = 0;

  for (const entry of vdj.entries) {
    const rvtr = rvtrFromLabel(entry.label);
    if (!rvtr || !RVTR_RE.test(rvtr)) continue;
    if (existingPackages.has(rvtr)) {
      skippedExisting += 1;
      continue;
    }
    if (!entry.artist.trim() || !entry.title.trim()) continue;

    const next = {
      rvtr,
      artist: entry.artist.trim(),
      title: entry.title.trim(),
      album: entry.album?.trim() || null,
      year: entry.year,
    };
    const prev = entries[rvtr];
    entries[rvtr] = pickBestEntry(prev, next);
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: vdj.entries.length > 0 ? vdj.path : null,
    entryCount: Object.keys(entries).length,
    entries,
  };

  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, `${JSON.stringify(payload)}\n`, "utf8");

  return {
    indexPath,
    entryCount: payload.entryCount,
    vdjPath: vdj.path,
    skippedExisting,
  };
}

function main() {
  const result = prepareVdjRvtrIndex();
  console.log(
    `[prepare-vdj-rvtr-index] entries=${result.entryCount} skipped_existing_packages=${result.skippedExisting} source=${result.vdjPath}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
