import "server-only";

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { cache } from "react";

import { loadNpmScriptCatalog } from "@/lib/atlas/npm-script-catalog";

import { buildApiReferenceIndex, scanApiEndpoints } from "./scan-apis";
import { scanAppRoutes } from "./scan-routes";
import { scanDataSources, scanEnvironmentVariableNames } from "./scan-data";
import { scanReports, scanWorkers, SYSTEM_PIPELINES } from "./scan-workers-reports";
import type { SystemMap, SystemMapCachePayload } from "./types";

const CACHE_PATH = join(process.cwd(), "data/ops/atlas/system-map-cache.json");
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = 1 as const;

function cacheIsFresh(): boolean {
  if (!existsSync(CACHE_PATH)) return false;
  try {
    const stat = statSync(CACHE_PATH);
    return Date.now() - stat.mtimeMs < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

function readCache(): SystemMap | null {
  if (!cacheIsFresh()) return null;
  try {
    const parsed = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as SystemMapCachePayload;
    if (parsed.cacheVersion !== CACHE_VERSION) return null;
    return { ...parsed, cached: true };
  } catch {
    return null;
  }
}

function writeCache(map: SystemMap): void {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  const payload: SystemMapCachePayload = {
    ...map,
    cacheVersion: CACHE_VERSION,
  };
  writeFileSync(CACHE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function buildSystemMap(): Promise<SystemMap> {
  const [scriptCatalog, referenceIndex] = await Promise.all([
    loadNpmScriptCatalog(),
    Promise.resolve(buildApiReferenceIndex()),
  ]);

  const routes = scanAppRoutes();
  const apis = scanApiEndpoints(referenceIndex);
  const dataSources = scanDataSources();
  const workers = scanWorkers();
  const reportGroups = scanReports();
  const environmentVariables = scanEnvironmentVariableNames();

  const reportCount = reportGroups.reduce((sum, group) => sum + group.reports.length, 0);
  const byCategory = scriptCatalog.scripts.reduce<Record<string, number>>((acc, script) => {
    acc[script.category] = (acc[script.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    cached: false,
    health: {
      routes: routes.length,
      apiEndpoints: apis.length,
      scripts: scriptCatalog.scriptCount,
      workers: workers.length,
      reports: reportCount,
      dataSources: dataSources.length,
    },
    routes,
    apis,
    scriptSummary: {
      total: scriptCatalog.scriptCount,
      byCategory,
      launcherHref: "/ops/atlas/scripts",
    },
    pipelines: SYSTEM_PIPELINES.map((pipeline) => ({
      id: pipeline.id,
      title: pipeline.title,
      steps: [...pipeline.steps],
    })),
    dataSources,
    environmentVariables,
    workers,
    reportGroups,
  };
}

export const loadSystemMap = cache(async (): Promise<SystemMap> => {
  const cached = readCache();
  if (cached) return cached;

  const map = await buildSystemMap();
  writeCache(map);
  return map;
});

export function getSystemMapCachePath(): string {
  return CACHE_PATH;
}
