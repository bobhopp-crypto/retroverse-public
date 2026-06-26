import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { directorHandoffPath, directorOutputPath, directorRenderSpecPath } from "./paths";
import { runDirectorOnHandoff } from "./run-director";
import type { DirectorPackage } from "./types";

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function loadDirectorHandoff(
  rvtr: string,
): Promise<DirectorEditorialPackage | null> {
  try {
    const raw = await readFile(directorHandoffPath(rvtr), "utf8");
    return JSON.parse(raw) as DirectorEditorialPackage;
  } catch {
    return null;
  }
}

export async function saveDirectorHandoff(
  handoff: DirectorEditorialPackage,
): Promise<void> {
  await writeJson(directorHandoffPath(handoff.rvtr), handoff);
}

export async function loadDirectorPackage(rvtr: string): Promise<DirectorPackage | null> {
  try {
    const raw = await readFile(directorOutputPath(rvtr), "utf8");
    return JSON.parse(raw) as DirectorPackage;
  } catch {
    return null;
  }
}

export async function saveDirectorPackage(pkg: DirectorPackage): Promise<void> {
  await writeJson(directorOutputPath(pkg.rvtr), pkg);
}

/** Load handoff → build plan + render spec → write director.json + director-render-spec.json */
export async function runAndSaveDirector(rvtr: string): Promise<DirectorPackage | null> {
  const handoff = await loadDirectorHandoff(rvtr);
  if (!handoff) return null;
  const pkg = runDirectorOnHandoff(handoff);
  await saveDirectorPackage(pkg);
  if (pkg.renderSpec) {
    await writeJson(directorRenderSpecPath(pkg.rvtr), pkg.renderSpec);
  }
  return pkg;
}
