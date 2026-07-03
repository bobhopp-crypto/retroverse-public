import "server-only";

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

import type { SystemDataSource } from "./types";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function scanTreeStats(root: string, maxDepth = 2): {
  sizeBytes: number;
  lastModifiedMs: number;
} {
  let sizeBytes = 0;
  let lastModifiedMs = 0;

  function walk(dir: string, depth: number) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      lastModifiedMs = Math.max(lastModifiedMs, stat.mtimeMs);
      if (stat.isFile()) {
        sizeBytes += stat.size;
      } else if (stat.isDirectory() && depth < maxDepth) {
        walk(full, depth + 1);
      }
    }
  }

  if (existsSync(root)) walk(root, 0);
  return { sizeBytes, lastModifiedMs };
}

function describeDataDir(name: string): string {
  const key = name.toLowerCase();
  if (key.includes("intelligence")) return "Intelligence and research department artifacts.";
  if (key.includes("ops")) return "Bundled ops datasets and local mirrors.";
  if (key.includes("search")) return "Search index and entity exports.";
  if (key.includes("chart")) return "Chart history and trajectory data.";
  if (key.includes("cover")) return "Cover artwork and repair datasets.";
  if (key.includes("live")) return "Live event and now-playing state.";
  if (key.includes("sunday")) return "Sunday Nights event configuration.";
  if (key.includes("allstar")) return "All-Star Baseball archive data.";
  return "Project data directory.";
}

function listTopLevelDataSources(basePath: string, idPrefix: string): SystemDataSource[] {
  if (!existsSync(basePath)) {
    return [
      {
        id: `${idPrefix}-root`,
        path: basePath,
        purpose: "External or bundled data root.",
        sizeLabel: "missing",
        sizeBytes: 0,
        lastModified: "",
        exists: false,
      },
    ];
  }

  let entries: string[];
  try {
    entries = readdirSync(basePath);
  } catch {
    return [];
  }

  const rootStats = scanTreeStats(basePath, 3);
  const sources: SystemDataSource[] = [
    {
      id: `${idPrefix}-root`,
      path: basePath,
      purpose: idPrefix === "retroverse-data" ? "Authoritative Retroverse data root." : "Bundled repo data root.",
      sizeLabel: formatBytes(rootStats.sizeBytes),
      sizeBytes: rootStats.sizeBytes,
      lastModified: rootStats.lastModifiedMs
        ? new Date(rootStats.lastModifiedMs).toISOString()
        : "",
      exists: true,
    },
  ];

  for (const entry of entries.sort()) {
    const full = join(basePath, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    const stats = scanTreeStats(full, 2);
    sources.push({
      id: `${idPrefix}-${entry}`,
      path: full,
      purpose: describeDataDir(entry),
      sizeLabel: formatBytes(stats.sizeBytes),
      sizeBytes: stats.sizeBytes,
      lastModified: stats.lastModifiedMs ? new Date(stats.lastModifiedMs).toISOString() : "",
      exists: true,
    });
  }

  return sources;
}

export function scanDataSources(): SystemDataSource[] {
  const bundledData = join(process.cwd(), "data");
  const externalData =
    process.env.RETROVERSE_DATA_ROOT?.trim() ||
    join(process.cwd(), "../RETROVERSE_DATA");
  const packageJson = join(process.cwd(), "package.json");

  const sources: SystemDataSource[] = [
    ...listTopLevelDataSources(bundledData, "data"),
    ...listTopLevelDataSources(externalData, "retroverse-data"),
  ];

  if (existsSync(packageJson)) {
    const stat = statSync(packageJson);
    sources.push({
      id: "package-json",
      path: relative(process.cwd(), packageJson),
      purpose: "npm scripts, dependencies, and project metadata.",
      sizeLabel: formatBytes(stat.size),
      sizeBytes: stat.size,
      lastModified: stat.mtime.toISOString(),
      exists: true,
    });
  }

  return sources;
}

export function scanEnvironmentVariableNames(): string[] {
  const keys = Object.keys(process.env);
  const preferred = keys.filter(
    (key) =>
      key.startsWith("RETROVERSE_") ||
      key.startsWith("NEXT_PUBLIC_") ||
      key.startsWith("NODE_") ||
      key.startsWith("VERCEL_") ||
      key === "DATABASE_URL" ||
      key.startsWith("SUPABASE_") ||
      key.includes("OPS"),
  );

  const merged = new Set([...preferred, ...keys.filter((k) => k.startsWith("RETROVERSE_"))]);
  return [...merged].sort((a, b) => a.localeCompare(b));
}

export function readPackageScripts(): Record<string, string> {
  try {
    const parsed = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    return parsed.scripts ?? {};
  } catch {
    return {};
  }
}
