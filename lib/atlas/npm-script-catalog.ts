import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";

import { cache } from "react";

export const NPM_SCRIPT_RUN_ALLOWLIST = [
  "live-diagnose",
  "live-stop",
  "search:verify-index",
  "research:studio:mission-control-audit",
  "research:studio:snapshot",
] as const;

export type RunnableScriptName = (typeof NPM_SCRIPT_RUN_ALLOWLIST)[number];

const RUN_ALLOWLIST_SET = new Set<string>(NPM_SCRIPT_RUN_ALLOWLIST);

export const SCRIPT_CATEGORIES = [
  "Live",
  "Studio / Research",
  "Intelligence",
  "Cover",
  "Video Factory",
  "Search",
  "Ops Audits",
  "Knowledge / AI",
  "Other",
] as const;

export type ScriptCategory = (typeof SCRIPT_CATEGORIES)[number];

export type ScriptSafetyLabel =
  | "safe_diagnostic"
  | "long_running"
  | "writes_files"
  | "production_affecting";

export type NpmScriptEntry = {
  name: string;
  command: string;
  npmCommand: string;
  category: ScriptCategory;
  description: string;
  safety: ScriptSafetyLabel;
  safetyLabel: string;
  runnable: boolean;
};

export type NpmScriptCatalog = {
  generatedAt: string;
  scriptCount: number;
  categories: ScriptCategory[];
  scripts: NpmScriptEntry[];
  quickCards: Array<{
    title: string;
    scriptName: RunnableScriptName;
    description: string;
  }>;
};

const SAFETY_DISPLAY: Record<ScriptSafetyLabel, string> = {
  safe_diagnostic: "Safe diagnostic",
  long_running: "Long-running",
  writes_files: "Writes files",
  production_affecting: "Publishes/production-affecting",
};

const QUICK_CARDS: NpmScriptCatalog["quickCards"] = [
  {
    title: "Diagnose Live",
    scriptName: "live-diagnose",
    description: "Inspect live bridge health, dev server, and manifest state.",
  },
  {
    title: "Stop Live Bridge",
    scriptName: "live-stop",
    description: "Stop spawned live-now-playing bridge and dev processes.",
  },
  {
    title: "Mission Control Audit",
    scriptName: "research:studio:mission-control-audit",
    description: "Read-only Mission Control pipeline audit report.",
  },
  {
    title: "Studio Snapshot",
    scriptName: "research:studio:snapshot",
    description: "Capture a read-only Studio pipeline snapshot.",
  },
];

function categorizeScript(name: string): ScriptCategory {
  if (
    name === "live-diagnose" ||
    name === "live-stop" ||
    name === "live-now-playing" ||
    name.startsWith("live-")
  ) {
    return "Live";
  }
  if (name.startsWith("research:") || name.startsWith("experience:")) {
    return "Studio / Research";
  }
  if (name.startsWith("intelligence") || name.startsWith("vdj:")) {
    return "Intelligence";
  }
  if (name.startsWith("cover:")) {
    return "Cover";
  }
  if (name.startsWith("video-factory:")) {
    return "Video Factory";
  }
  if (name.startsWith("search:")) {
    return "Search";
  }
  if (
    name.startsWith("ops:") ||
    name.startsWith("track:") ||
    name.startsWith("healing:") ||
    name.startsWith("mb:") ||
    name.startsWith("smoke:")
  ) {
    return "Ops Audits";
  }
  if (name.startsWith("knowledge:")) {
    return "Knowledge / AI";
  }
  return "Other";
}

function inferSafety(name: string, command: string): ScriptSafetyLabel {
  if (RUN_ALLOWLIST_SET.has(name)) return "safe_diagnostic";

  const key = name.toLowerCase();
  const cmd = command.toLowerCase();

  if (
    key.includes("publish") ||
    key.includes("production") ||
    key === "live-now-playing" ||
    key.includes("collector-backlog") ||
    key === "build" ||
    key === "start" ||
    cmd.includes("process-song.ts --publish")
  ) {
    return "production_affecting";
  }

  if (
    key.includes("apply") ||
    key.includes("repair") ||
    key.includes("backfill") ||
    key.includes("seed") ||
    key.includes("refresh") ||
    key.includes("execution") ||
    key.includes("migration") ||
    key.includes("recovery-run") ||
    key.includes("retrain") ||
    key.includes("label-vdj") ||
    key === "prebuild"
  ) {
    return "writes_files";
  }

  if (
    key.includes("batch") ||
    key.includes("overnight") ||
    key.includes("loop") ||
    key.includes(":all") ||
    key.endsWith(":all") ||
    key.includes("deck-worker") ||
    key.includes("backlog") ||
    key === "intelligence" ||
    key.includes("next100") ||
    key.includes("next10")
  ) {
    return "long_running";
  }

  if (
    key.includes("audit") ||
    key.includes("diagnose") ||
    key.includes("verify") ||
    key.includes("snapshot") ||
    key.includes("smoke") ||
    key.includes("simulation") ||
    key.includes("report") ||
    key.includes("counts")
  ) {
    return "safe_diagnostic";
  }

  if (key.startsWith("dev") || key === "studio") {
    return "long_running";
  }

  return "writes_files";
}

function inferDescription(name: string, command: string): string {
  const key = name.toLowerCase();

  if (name === "live-diagnose") {
    return "Inspect live bridge health, dev server, and manifest state.";
  }
  if (name === "live-stop") {
    return "Stop spawned live-now-playing bridge and dev processes.";
  }
  if (name === "live-now-playing") {
    return "Start live now-playing bridge and supporting dev server.";
  }
  if (name === "search:verify-index") {
    return "Verify the public search index is present and healthy.";
  }
  if (name === "research:studio:mission-control-audit") {
    return "Read-only Mission Control pipeline audit report.";
  }
  if (name === "research:studio:snapshot") {
    return "Capture a read-only Studio pipeline snapshot.";
  }
  if (key.includes("audit")) return "Generate a read-only audit report.";
  if (key.includes("snapshot")) return "Capture a read-only pipeline snapshot.";
  if (key.includes("verify")) return "Verify artifacts, indexes, or repair results.";
  if (key.includes("diagnose")) return "Inspect runtime health and configuration.";
  if (key.includes("backfill")) return "Backfill missing data across the library.";
  if (key.includes("repair")) return "Repair or normalize stored artifacts.";
  if (key.includes("batch") || key.includes("overnight")) {
    return "Run a batch or overnight processing job.";
  }
  if (key.includes("publish")) return "Publish or promote content to a public surface.";
  if (key.startsWith("cover:")) return "Cover integrity, repair, or training workflow.";
  if (key.startsWith("video-factory:")) return "Video factory refresh, worker, or loop.";
  if (key.startsWith("intelligence")) return "Intelligence department batch or validation.";
  if (key.startsWith("research:")) return "Studio research, alpha batch, or proof run.";
  if (key.startsWith("ops:")) return "Ops audit, reconciliation, or match tooling.";
  if (key.startsWith("knowledge:")) return "Knowledge department bootstrap or AI tooling.";
  if (key.startsWith("search:")) return "Search index maintenance.";
  if (name === "dev" || name.startsWith("dev:")) return "Local development server tooling.";
  if (name === "build") return "Production build with search and state guards.";
  if (name === "studio") return "Launch the local Studio launcher.";

  const tool = command.match(/tools\/([^\s"']+)/)?.[1];
  if (tool) return `Runs ${tool.replace(/\//g, " → ")}.`;
  return "npm script from package.json.";
}

function categorySort(a: ScriptCategory, b: ScriptCategory): number {
  return SCRIPT_CATEGORIES.indexOf(a) - SCRIPT_CATEGORIES.indexOf(b);
}

export function isRunnableScript(name: string): name is RunnableScriptName {
  return RUN_ALLOWLIST_SET.has(name);
}

export const loadNpmScriptCatalog = cache(async (): Promise<NpmScriptCatalog> => {
  const packagePath = join(process.cwd(), "package.json");
  const raw = await readFile(packagePath, "utf8");
  const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
  const scriptsObj = parsed.scripts ?? {};

  const scripts: NpmScriptEntry[] = Object.entries(scriptsObj)
    .map(([name, command]) => {
      const safety = inferSafety(name, command);
      return {
        name,
        command,
        npmCommand: `npm run ${name}`,
        category: categorizeScript(name),
        description: inferDescription(name, command),
        safety,
        safetyLabel: SAFETY_DISPLAY[safety],
        runnable: isRunnableScript(name),
      };
    })
    .sort((a, b) => categorySort(a.category, b.category) || a.name.localeCompare(b.name));

  return {
    generatedAt: new Date().toISOString(),
    scriptCount: scripts.length,
    categories: [...SCRIPT_CATEGORIES],
    scripts,
    quickCards: QUICK_CARDS,
  };
});
