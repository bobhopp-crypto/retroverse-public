import "server-only";

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import {
  COLLECTOR_PACKAGE_VERSION,
  DIRECTOR_RENDER_SPEC_VERSION,
  EDITOR_STORY_VERSION,
  researchDepartmentPaths,
  researchDepartmentRoot,
} from "@/lib/studio/package";
import type { StudioConfidenceLabel } from "@/lib/studio/types";
import { completionPct } from "@/lib/studio/metrics";

import type { Bp2PackageIntegrityReport, Bp2Row } from "./types";

const RVTR_DIR = /^RVTR\d+$/i;

type VersionCheck = {
  artifact: "collector" | "editor" | "director" | "render-spec";
  path: string;
  expected: string;
  readVersion: (raw: Record<string, unknown>) => string | null;
};

const VERSION_CHECKS: VersionCheck[] = [
  {
    artifact: "collector",
    path: "collector",
    expected: String(COLLECTOR_PACKAGE_VERSION),
    readVersion: (raw) => (raw.version != null ? String(raw.version) : null),
  },
  {
    artifact: "editor",
    path: "editor",
    expected: String(EDITOR_STORY_VERSION),
    readVersion: (raw) => (raw.version != null ? String(raw.version) : null),
  },
  {
    artifact: "render-spec",
    path: "directorRenderSpec",
    expected: DIRECTOR_RENDER_SPEC_VERSION,
    readVersion: (raw) =>
      raw.version != null
        ? String(raw.version)
        : raw.renderSpecVersion != null
          ? String(raw.renderSpecVersion)
          : null,
  },
];

async function readJson(path: string): Promise<Record<string, unknown> | null> {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Scan on-disk Studio Alpha packages for completeness and version drift. */
export async function buildPackageIntegrityReport(
  rows: Bp2Row[],
): Promise<Bp2PackageIntegrityReport> {
  const identifiedRvtrs = new Set(
    rows.filter((r) => r.rvtr).map((r) => r.rvtr!.toUpperCase()),
  );

  let diskRvtrs: string[] = [];
  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(researchDepartmentRoot(), { withFileTypes: true });
    diskRvtrs = entries
      .filter((e) => e.isDirectory() && RVTR_DIR.test(e.name))
      .map((e) => e.name.toUpperCase());
  } catch {
    diskRvtrs = [];
  }

  const scanRvtrs = [...new Set([...identifiedRvtrs, ...diskRvtrs])].sort();

  const missingCollector: string[] = [];
  const missingEditor: string[] = [];
  const missingDirector: string[] = [];
  const missingRenderSpec: string[] = [];
  const outdatedVersions: Bp2PackageIntegrityReport["outdatedVersions"] = [];

  let completePackages = 0;

  for (const rvtr of scanRvtrs) {
    const paths = researchDepartmentPaths(rvtr);
    const [collector, editor, director, renderSpec] = await Promise.all([
      readJson(paths.collector),
      readJson(paths.editor),
      readJson(paths.director),
      readJson(paths.directorRenderSpec),
    ]);

    const hasCollector = Boolean(collector);
    const hasEditor = Boolean(editor);
    const hasDirector = Boolean(director);
    const hasRenderSpec = Boolean(renderSpec);

    if (!hasCollector) missingCollector.push(rvtr);
    if (!hasEditor) missingEditor.push(rvtr);
    if (!hasDirector) missingDirector.push(rvtr);
    if (!hasRenderSpec) missingRenderSpec.push(rvtr);

    if (hasCollector && hasEditor && hasDirector && hasRenderSpec) {
      completePackages += 1;
    }

    const files: Array<[VersionCheck, Record<string, unknown> | null]> = [
      [VERSION_CHECKS[0]!, collector],
      [VERSION_CHECKS[1]!, editor],
      [VERSION_CHECKS[2]!, renderSpec],
    ];

    for (const [check, raw] of files) {
      if (!raw) continue;
      const found = check.readVersion(raw);
      if (found && found !== check.expected) {
        outdatedVersions.push({
          rvtr,
          artifact: check.artifact,
          found,
          expected: check.expected,
        });
      }
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    totalPackages: scanRvtrs.length,
    completePackages,
    completePct: completionPct(completePackages, scanRvtrs.length),
    missingCollector: missingCollector.slice(0, 100),
    missingEditor: missingEditor.slice(0, 100),
    missingDirector: missingDirector.slice(0, 100),
    missingRenderSpec: missingRenderSpec.slice(0, 100),
    missingCollectorTotal: missingCollector.length,
    missingEditorTotal: missingEditor.length,
    missingDirectorTotal: missingDirector.length,
    missingRenderSpecTotal: missingRenderSpec.length,
    outdatedVersions: outdatedVersions.slice(0, 100),
    outdatedVersionsTotal: outdatedVersions.length,
  };
}
