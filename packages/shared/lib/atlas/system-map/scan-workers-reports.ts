import "server-only";

import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

import type { SystemReportGroup, SystemWorker } from "./types";
import { readPackageScripts } from "./scan-data";

const WORKER_SCRIPT_PATTERN =
  /(loop|worker|overnight|live-now-playing|deck-worker|batch|backlog|refresh|run-once)/i;

function inferWorkerPurpose(name: string, command: string): string {
  const key = `${name} ${command}`.toLowerCase();
  if (name === "live-now-playing") return "Starts live bridge and supporting dev server.";
  if (name.startsWith("video-factory:")) return "Video factory background processing.";
  if (name.includes("collector-backlog")) return "Runs Studio collector backlog queue.";
  if (name.includes("overnight")) return "Overnight batch worker.";
  if (name.includes("loop")) return "Long-running loop worker.";
  if (name.includes("deck-worker")) return "Video factory deck worker.";
  if (key.includes("intelligence")) return "Intelligence batch or validation worker.";
  return "Background or long-running npm script.";
}

export function scanWorkers(): SystemWorker[] {
  const scripts = readPackageScripts();
  const workers: SystemWorker[] = [];

  for (const [name, command] of Object.entries(scripts)) {
    if (!WORKER_SCRIPT_PATTERN.test(name) && !WORKER_SCRIPT_PATTERN.test(command)) continue;
    const entryMatch = command.match(/tools\/[^\s"']+/);
    workers.push({
      name,
      entryPoint: entryMatch?.[0] ?? command.split(/\s+/).pop() ?? command,
      startedByScript: `npm run ${name}`,
      purpose: inferWorkerPurpose(name, command),
    });
  }

  const toolsRoot = join(process.cwd(), "tools");
  function walkTools(dir: string) {
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
      if (stat.isDirectory()) {
        walkTools(full);
        continue;
      }
      if (!/worker|loop|batch-run|overnight/i.test(entry)) continue;
      const rel = relative(process.cwd(), full);
      if (workers.some((worker) => worker.entryPoint === rel)) continue;
      workers.push({
        name: rel,
        entryPoint: rel,
        startedByScript: "(manual / referenced by npm script)",
        purpose: "Tooling entry point for background or batch work.",
      });
    }
  }

  walkTools(toolsRoot);

  return workers.sort((a, b) => a.name.localeCompare(b.name));
}

export function scanReports(): SystemReportGroup[] {
  const reportsRoot = join(process.cwd(), "reports");
  let topEntries: string[];
  try {
    topEntries = readdirSync(reportsRoot);
  } catch {
    return [];
  }

  const groups: SystemReportGroup[] = [];

  for (const folder of topEntries.sort()) {
    const folderPath = join(reportsRoot, folder);
    let stat;
    try {
      stat = statSync(folderPath);
    } catch {
      continue;
    }

    if (stat.isFile()) {
      groups.push({
        folder: "(root)",
        reports: [
          {
            name: folder,
            relativePath: relative(process.cwd(), folderPath),
            lastModified: stat.mtime.toISOString(),
            kind: "file",
          },
        ],
      });
      continue;
    }

    if (!stat.isDirectory()) continue;

    let children: string[];
    try {
      children = readdirSync(folderPath);
    } catch {
      continue;
    }

    const reports = children
      .map((name) => {
        const full = join(folderPath, name);
        let childStat;
        try {
          childStat = statSync(full);
        } catch {
          return null;
        }
        return {
          name,
          relativePath: relative(process.cwd(), full),
          lastModified: childStat.mtime.toISOString(),
          kind: childStat.isDirectory() ? ("folder" as const) : ("file" as const),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null)
      .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
      .slice(0, 24);

    groups.push({ folder, reports });
  }

  return groups.sort((a, b) => a.folder.localeCompare(b.folder));
}

export const SYSTEM_PIPELINES = [
  {
    id: "studio-production",
    title: "Studio Production Pipeline",
    steps: ["Collector", "Editor", "Director", "Creative Review", "Publisher"],
  },
  {
    id: "live-show",
    title: "Live Show Pipeline",
    steps: ["Live Bridge", "Current Song API", "Live Experience"],
  },
  {
    id: "intelligence-research",
    title: "Intelligence Research",
    steps: ["VDJ Library", "Intelligence Batch", "Research Vault", "Package Index"],
  },
  {
    id: "search-discovery",
    title: "Search Discovery",
    steps: ["Canonical Graph", "Search Index", "Public Search", "Entity Pages"],
  },
] as const;
