import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

import { bundledIntelligenceRoot } from "@/lib/ops/intelligence/paths";
import { normalizeRvtr } from "@/lib/studio/status";

import type { ExperienceDriftReport, ExperienceEvolutionStore, GoldenPackageRecord } from "./types";
import { EXPERIENCE_EVOLUTION_VERSION } from "./types";

function storePath(): string {
  return join(bundledIntelligenceRoot(), "..", "studio", "experience-evolution.json");
}

function emptyStore(): ExperienceEvolutionStore {
  return {
    version: EXPERIENCE_EVOLUTION_VERSION,
    updatedAt: new Date().toISOString(),
    goldenPackages: [],
    driftReports: [],
  };
}

export async function loadExperienceEvolutionStore(): Promise<ExperienceEvolutionStore> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ExperienceEvolutionStore>;
    return {
      ...emptyStore(),
      ...parsed,
      goldenPackages: Array.isArray(parsed.goldenPackages) ? parsed.goldenPackages : [],
      driftReports: Array.isArray(parsed.driftReports) ? parsed.driftReports : [],
    };
  } catch {
    return emptyStore();
  }
}

async function saveExperienceEvolutionStore(store: ExperienceEvolutionStore): Promise<void> {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export async function isGoldenPackage(rvtr: string): Promise<boolean> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return false;
  const store = await loadExperienceEvolutionStore();
  return store.goldenPackages.some((g) => g.rvtr === normalized);
}

export async function getGoldenPackage(rvtr: string): Promise<GoldenPackageRecord | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;
  const store = await loadExperienceEvolutionStore();
  return store.goldenPackages.find((g) => g.rvtr === normalized) ?? null;
}

export async function listGoldenPackages(): Promise<GoldenPackageRecord[]> {
  const store = await loadExperienceEvolutionStore();
  return store.goldenPackages;
}

export async function promoteGoldenPackage(record: GoldenPackageRecord): Promise<GoldenPackageRecord> {
  const normalized = normalizeRvtr(record.rvtr);
  if (!normalized) throw new Error("invalid_rvtr");

  const store = await loadExperienceEvolutionStore();
  const next: GoldenPackageRecord = { ...record, rvtr: normalized };
  store.goldenPackages = store.goldenPackages.filter((g) => g.rvtr !== normalized);
  store.goldenPackages.unshift(next);
  store.goldenPackages = store.goldenPackages.slice(0, 200);
  await saveExperienceEvolutionStore(store);
  return next;
}

export async function appendDriftReport(report: ExperienceDriftReport): Promise<void> {
  const store = await loadExperienceEvolutionStore();
  store.driftReports.unshift(report);
  store.driftReports = store.driftReports.slice(0, 100);
  await saveExperienceEvolutionStore(store);
}

export async function getLatestDriftReport() {
  const store = await loadExperienceEvolutionStore();
  return store.driftReports[0] ?? null;
}
