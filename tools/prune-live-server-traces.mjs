#!/usr/bin/env node
/**
 * Apply outputFileTracingExcludes to every Live server .nft.json manifest.
 *
 * Next build traces from the monorepo root (outputFileTracingRoot) and can
 * attach the full data/ops/intelligence tree (~60k+ RVTR JSON files) to API
 * routes that never read them. Configured excludes are not always applied to
 * per-route manifests; this post-build pass enforces them before Vercel packaging.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import picomatch from "next/dist/compiled/picomatch/index.js";

const require = createRequire(import.meta.url);
const liveDir = process.cwd();
const nextConfig = require(path.join(liveDir, "next.config.js"));
const distServer = path.join(liveDir, ".next", "server");

const DEFAULT_EXCLUDES = [
  "./data/ops/intelligence/**",
  "../../data/ops/intelligence/**",
  "./data/finance-imports/**",
  "../../data/finance-imports/**",
  "./data/ops/allstar/**",
  "../../data/ops/allstar/**",
  "../../apps/studio/**",
  "../../reports/**",
  "../../tools/**",
  "../../docs/**",
  "../../logs/**",
  "../../tmp/**",
  "../../.vercel/**",
];

function excludesForRoute(routeKey) {
  const fromConfig = nextConfig.outputFileTracingExcludes ?? {};
  const combined = new Set(DEFAULT_EXCLUDES);
  for (const [glob, patterns] of Object.entries(fromConfig)) {
    if (glob === "*") {
      for (const pattern of patterns) combined.add(pattern);
      continue;
    }
    if (picomatch(glob, { dot: true, contains: true })(routeKey)) {
      for (const pattern of patterns) combined.add(pattern);
    }
  }
  return [...combined];
}

function routeKeyFromNft(nftPath) {
  const rel = path
    .relative(distServer, nftPath)
    .replace(/\.js\.nft\.json$/, "")
    .replace(/\\/g, "/");
  if (!rel.startsWith("app/")) return rel;
  const segments = rel.split("/");
  const trimmed = segments.slice(0, -1);
  if (trimmed.at(-1) === "route") trimmed.pop();
  return `/${trimmed.join("/")}`.replace(/\/+/g, "/");
}

function pruneNft(nftPath) {
  const pageDir = path.dirname(nftPath);
  const routeKey = routeKeyFromNft(nftPath);
  const patterns = excludesForRoute(routeKey).map((exclude) =>
    path.join(liveDir, exclude),
  );
  const isExcluded = picomatch(patterns, { dot: true, contains: true });

  const content = JSON.parse(fs.readFileSync(nftPath, "utf8"));
  const before = content.files.length;
  const files = content.files.filter((file) => {
    const absolute = path.normalize(path.join(pageDir, file));
    return !isExcluded(absolute);
  });

  if (files.length === before) return null;

  fs.writeFileSync(
    nftPath,
    `${JSON.stringify({ version: content.version ?? 1, files }, null, 0)}\n`,
    "utf8",
  );
  return { routeKey, before, after: files.length, removed: before - files.length };
}

function walk(dir, results) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
      continue;
    }
    if (!entry.name.endsWith(".nft.json")) continue;
    const summary = pruneNft(full);
    if (summary) results.push(summary);
  }
}

function main() {
  if (!fs.existsSync(distServer)) {
    console.warn("[prune-live-server-traces] .next/server missing — skipping");
    return;
  }

  const results = [];
  walk(distServer, results);

  const totalRemoved = results.reduce((sum, row) => sum + row.removed, 0);
  const chapters = results.find((row) => row.routeKey.includes("/api/events/") && row.routeKey.includes("/chapters"));
  console.log(
    `[prune-live-server-traces] pruned ${results.length} manifests, removed ${totalRemoved} traced files`,
  );
  if (chapters) {
    console.log(
      `[prune-live-server-traces] /api/events/[slug]/chapters: ${chapters.before} → ${chapters.after} files`,
    );
  }
}

main();
