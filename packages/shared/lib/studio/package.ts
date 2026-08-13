import { join } from "path";

import { bundledIntelligenceRoot, songPackagesDir } from "@/lib/ops/intelligence/paths";

/** Canonical package version constants (single kernel source of truth). */
export const COLLECTOR_PACKAGE_VERSION = 4 as const;
export const EDITOR_STORY_VERSION = 2 as const;
export const DIRECTOR_EDITORIAL_VERSION = 2 as const;
export const DIRECTOR_PLAN_VERSION = "0.3" as const;
export const DIRECTOR_RENDER_SPEC_VERSION = "0.3" as const;
export const VISUAL_LIBRARY_VERSION = 1 as const;
export const RETROGRAPH_VERSION = 1 as const;

export type PackageArtifactKind =
  | "intelligence"
  | "collector"
  | "visual-identity"
  | "song-dna"
  | "retrograph"
  | "dossier"
  | "editor"
  | "director-handoff"
  | "director"
  | "director-render-spec"
  | "visual-library";

export type ResearchDepartmentPaths = {
  songDir: string;
  collector: string;
  visualIdentity: string;
  songDna: string;
  retrograph: string;
  dossier: string;
  editor: string;
  directorHandoff: string;
  director: string;
  directorRenderSpec: string;
  visualLibrary: string;
  visualAssets: string;
  collectorTemp: string;
};

export function researchDepartmentRoot(): string {
  return join(bundledIntelligenceRoot(), "research-department");
}

export function collectorSongDir(rvtr: string): string {
  const identity = rvtr.trim().toUpperCase();
  const directoryName = identity.startsWith("VDJ:")
    ? `VDJ-${identity.slice(4).toLowerCase()}`
    : identity;
  return join(researchDepartmentRoot(), directoryName);
}

export function collectorOutputPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "collector.json");
}

export function collectorVisualIdentityPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "visual-identity.json");
}

export function collectorSongDnaPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "song-dna.json");
}

export function retrographOutputPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "retrograph.json");
}

/** Legacy flat mirror filename — `{RVTR}.retrograph.json` incremental migration target. */
export function retrographLegacyDossierPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), `${rvtr.trim().toUpperCase()}.retrograph.json`);
}

/** @deprecated Sprint 3.29 — use `retrographOutputPath`. Legacy mirror still written for compatibility. */
export function dossierOutputPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "dossier.json");
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

/** Sprint 3.18 — shared pipeline event log (activity feed source of truth). */
export function studioPipelineEventsPath(): string {
  return join(researchDepartmentRoot(), "studio-pipeline-events.json");
}

/** Sprint 3.18 — editor / director / publisher runtime progress. */
export function departmentRuntimeProgressPath(): string {
  return join(researchDepartmentRoot(), "department-runtime-progress.json");
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

export function visualLibraryPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "visual-library.json");
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
    visualIdentity: collectorVisualIdentityPath(rvtr),
    songDna: collectorSongDnaPath(rvtr),
    retrograph: retrographOutputPath(rvtr),
    dossier: dossierOutputPath(rvtr),
    editor: editorOutputPath(rvtr),
    directorHandoff: directorHandoffPath(rvtr),
    director: directorOutputPath(rvtr),
    directorRenderSpec: directorRenderSpecPath(rvtr),
    visualLibrary: visualLibraryPath(rvtr),
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
    case "visual-identity":
      return collectorVisualIdentityPath(rvtr);
    case "song-dna":
      return collectorSongDnaPath(rvtr);
    case "retrograph":
      return retrographOutputPath(rvtr);
    case "dossier":
      return dossierOutputPath(rvtr);
    case "editor":
      return editorOutputPath(rvtr);
    case "director-handoff":
      return directorHandoffPath(rvtr);
    case "director":
      return directorOutputPath(rvtr);
    case "director-render-spec":
      return directorRenderSpecPath(rvtr);
    case "visual-library":
      return visualLibraryPath(rvtr);
  }
}
