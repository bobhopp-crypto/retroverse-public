import { join } from "path";

import { bundledIntelligenceRoot, songPackagesDir } from "@/lib/ops/intelligence/paths";

/** Canonical package version constants (single kernel source of truth). */
export const COLLECTOR_PACKAGE_VERSION = 4 as const;
export const EDITOR_STORY_VERSION = 2 as const;
export const DIRECTOR_EDITORIAL_VERSION = 2 as const;
export const DIRECTOR_PLAN_VERSION = "0.3" as const;
export const DIRECTOR_RENDER_SPEC_VERSION = "0.3" as const;

export type PackageArtifactKind =
  | "intelligence"
  | "collector"
  | "editor"
  | "director-handoff"
  | "director"
  | "director-render-spec";

export type ResearchDepartmentPaths = {
  songDir: string;
  collector: string;
  editor: string;
  directorHandoff: string;
  director: string;
  directorRenderSpec: string;
  visualAssets: string;
  collectorTemp: string;
};

export function researchDepartmentRoot(): string {
  return join(bundledIntelligenceRoot(), "research-department");
}

export function collectorSongDir(rvtr: string): string {
  return join(researchDepartmentRoot(), rvtr.trim().toUpperCase());
}

export function collectorOutputPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "collector.json");
}

export function collectorTempDir(rvtr: string): string {
  return join(collectorSongDir(rvtr), "collector-temp");
}

export function collectorVisualAssetsDir(rvtr: string): string {
  return join(collectorSongDir(rvtr), "visual-assets");
}

export function collectorProgressPath(): string {
  return join(researchDepartmentRoot(), "collector-progress.json");
}

export function editorOutputPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "editor.json");
}

export function editorV1BackupPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "editor.v1.backup.json");
}

export function directorHandoffPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "director-handoff.json");
}

export function directorOutputPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "director.json");
}

export function directorRenderSpecPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "director-render-spec.json");
}

/** Legacy intelligence pipeline package path (separate from Studio Alpha artifacts). */
export function intelligencePackagePath(rvtr: string): string {
  return join(songPackagesDir(), `${rvtr.trim().toUpperCase()}.json`);
}

/** Resolve on-disk paths for Studio Alpha artifacts under research-department/. */
export function researchDepartmentPaths(rvtr: string): ResearchDepartmentPaths {
  const songDir = collectorSongDir(rvtr);
  return {
    songDir,
    collector: collectorOutputPath(rvtr),
    editor: editorOutputPath(rvtr),
    directorHandoff: directorHandoffPath(rvtr),
    director: directorOutputPath(rvtr),
    directorRenderSpec: directorRenderSpecPath(rvtr),
    visualAssets: collectorVisualAssetsDir(rvtr),
    collectorTemp: collectorTempDir(rvtr),
  };
}

/** Resolve a single artifact path by kind. */
export function packageArtifactPath(rvtr: string, kind: PackageArtifactKind): string {
  switch (kind) {
    case "intelligence":
      return intelligencePackagePath(rvtr);
    case "collector":
      return collectorOutputPath(rvtr);
    case "editor":
      return editorOutputPath(rvtr);
    case "director-handoff":
      return directorHandoffPath(rvtr);
    case "director":
      return directorOutputPath(rvtr);
    case "director-render-spec":
      return directorRenderSpecPath(rvtr);
  }
}
