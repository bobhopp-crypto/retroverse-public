#!/usr/bin/env npx tsx
/**
 * Temporary export — viewer design reference packages.
 *
 * Uses the exact public homepage package loader (`loadPackageBrowser`),
 * not filesystem guessing or research-department dossiers.
 *
 * Usage:
 *   npx tsx tools/export-viewer-design-packages.ts
 */
require("./finance/preload-server-only.cjs");

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { loadPackageBrowser } from "../lib/home/load-package-browser.ts";
import { inspectQuery } from "../lib/inspect/pg.ts";
import { isSongExperienceRenderable } from "../lib/ops/intelligence/song-experience-renderability-core.ts";
import {
  bundledSongPackagePath,
  songPackagePath,
} from "../lib/ops/intelligence/paths.ts";
import { loadSongPackage, normalizePackageRvtr } from "../lib/ops/intelligence/song-package-store.ts";

const OUT_DIR = join(process.cwd(), "tmp", "viewer-design-packages");

const TARGETS = [
  { slug: "american-pie", title: "American Pie", artist: "Don McLean" },
  { slug: "dreadlock-holiday", title: "Dreadlock Holiday", artist: "10cc" },
] as const;

const LOADER_FUNCTION = "loadPackageBrowser";
const LOADER_FILE = "lib/home/load-package-browser.ts";
const LOADER_CHAIN = [
  "app/homepage-actions.ts · fetchPackageBrowserByRvtr / fetchHomepagePackage",
  "lib/home/load-package-browser.ts · loadPackageBrowser",
  "lib/ops/intelligence/song-package-store.ts · loadSongPackage",
  "lib/ops/intelligence/song-experience-renderability-core.ts · isSongExperienceRenderable",
  "lib/ops/intelligence/package-intel.ts · hydratePackageIntel",
  "lib/home/load-package-browser.ts · buildPackageBrowserFromPackage",
  "lib/visual-profile/hero-resolver.ts · resolveHeroFromSongPackage",
  "lib/ops/intelligence/package-view-model.ts · buildPackageViewModel",
];

async function resolveCanonicalRvtr(title: string, artist: string): Promise<string | null> {
  try {
    const rows = await inspectQuery<{ track_id: string }>(
      `
      SELECT track_id
      FROM canonical_track_display
      WHERE lower(canonical_title) = lower($1)
        AND lower(canonical_artist_name) LIKE '%' || lower($2) || '%'
      ORDER BY has_hot100 DESC, peak_hot100_position ASC NULLS LAST
      LIMIT 1
      `,
      [title, artist],
    );
    const rvtr = rows[0]?.track_id?.trim().toUpperCase() ?? "";
    return normalizePackageRvtr(rvtr);
  } catch {
    return null;
  }
}

async function resolvePackageSourcePath(rvtr: string): Promise<string | null> {
  const id = normalizePackageRvtr(rvtr);
  if (!id) return null;

  for (const path of [songPackagePath(id), bundledSongPackagePath(id)]) {
    try {
      await readFile(path, "utf8");
      return path;
    } catch {
      /* try next store */
    }
  }
  return null;
}

function classifySourceLocation(
  sourcePath: string | null,
  status: string | null,
): string {
  if (!sourcePath) return "not found";

  if (sourcePath.includes(`${join("data", "ops", "intelligence", "packages")}`)) {
    return status === "published" || status === "review"
      ? "bundled editor-approved package (repo data/)"
      : "bundled package copy (repo data/) — not renderable on homepage";
  }

  if (sourcePath.includes(`${join("ops", "intelligence", "packages")}`)) {
    if (status === "published") return "editor-published package (RETROVERSE_DATA)";
    if (status === "review") return "editor review package (RETROVERSE_DATA)";
    if (status === "approved") return "editor-approved package (RETROVERSE_DATA) — status not in homepage render set";
    if (status === "draft") return "draft package (RETROVERSE_DATA) — homepage loader rejects draft";
    return `package store (RETROVERSE_DATA) — status ${status ?? "unknown"}`;
  }

  if (sourcePath.includes("research-department")) {
    return "older research-department location — NOT used by homepage loader";
  }

  return sourcePath;
}

async function exportTarget(target: (typeof TARGETS)[number]) {
  const rvtr =
    (await resolveCanonicalRvtr(target.title, target.artist)) ??
    (target.slug === "american-pie" ? "RVTR891825" : "RVTR462471");

  const raw = rvtr ? await loadSongPackage(rvtr) : null;
  const sourceFilePath = rvtr ? await resolvePackageSourcePath(rvtr) : null;
  const renderable = raw ? isSongExperienceRenderable(raw.status) : false;
  const model = rvtr ? await loadPackageBrowser(rvtr) : null;

  return {
    slug: target.slug,
    outputFile: `${target.slug}.json`,
    exportMeta: {
      loaderFunction: LOADER_FUNCTION,
      loaderFile: LOADER_FILE,
      loaderChain: LOADER_CHAIN,
      rvtr,
      song: { title: target.title, artist: target.artist },
      rawPackageStatus: raw?.status ?? null,
      renderableOnHomepage: renderable,
      homepageWouldDisplay: model != null,
      sourceFilePath,
      sourceLocation: classifySourceLocation(sourceFilePath, raw?.status ?? null),
      loadedAt: new Date().toISOString(),
      cardCount: model?.cards.length ?? 0,
      note:
        model == null
          ? raw
            ? `loadPackageBrowser returned null — status "${raw.status}" is not in renderable set (published|review).`
            : "loadPackageBrowser returned null — no package file found in song-package-store paths."
          : null,
    },
    model,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const exports = await Promise.all(TARGETS.map((target) => exportTarget(target)));

  for (const entry of exports) {
    const outPath = join(OUT_DIR, entry.outputFile);
    await writeFile(outPath, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    purpose: "Viewer design reference — exact homepage/live package browser loader output",
    loaderFunction: LOADER_FUNCTION,
    loaderFile: LOADER_FILE,
    loaderChain: LOADER_CHAIN,
    outputDirectory: OUT_DIR,
    packages: exports.map((entry) => ({
      file: entry.outputFile,
      rvtr: entry.exportMeta.rvtr,
      song: entry.exportMeta.song,
      rawPackageStatus: entry.exportMeta.rawPackageStatus,
      homepageWouldDisplay: entry.exportMeta.homepageWouldDisplay,
      sourceFilePath: entry.exportMeta.sourceFilePath,
      sourceLocation: entry.exportMeta.sourceLocation,
      cardCount: entry.exportMeta.cardCount,
      note: entry.exportMeta.note,
    })),
  };

  await writeFile(join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
