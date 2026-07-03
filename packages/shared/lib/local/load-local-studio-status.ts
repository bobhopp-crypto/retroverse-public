import "server-only";

import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { inspectPing } from "@/lib/inspect/pg";
import { ollamaAvailable } from "@/lib/ops/intelligence/ollama-client";

export type LocalServiceStatus = {
  id: "dev-server" | "live-bridge" | "ollama" | "database" | "ops-env";
  label: string;
  online: boolean;
  detail: string;
  nextAction: string;
};

export type LocalStudioLauncherData = {
  generatedAt: string;
  studioOnline: boolean;
  opsEnabled: boolean;
  services: LocalServiceStatus[];
  offlineServices: LocalServiceStatus[];
  links: {
    commandCenter: string;
    atlasLibrary: string;
    scriptLauncher: string;
    systemMap: string;
    architecture: string;
    databaseExplorer: string;
    diagnoseLive: string;
  };
};

function dataRoot(): string {
  return (
    process.env.RETROVERSE_DATA_ROOT?.trim() ||
    join(process.cwd(), "../RETROVERSE_DATA")
  );
}

function manifestPath(root: string): string {
  return join(root, "live", "processes.json");
}

function pidAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLiveBridgePid(root: string): number | null {
  const path = manifestPath(root);
  if (!existsSync(path)) return null;
  try {
    const manifest = JSON.parse(readFileSync(path, "utf8")) as {
      bridge?: { pid?: number } | null;
    };
    return manifest.bridge?.pid ?? null;
  } catch {
    return null;
  }
}

async function checkLiveBridge(): Promise<Pick<LocalServiceStatus, "online" | "detail">> {
  const root = dataRoot();
  const pid = readLiveBridgePid(root);
  if (!pid) {
    return { online: false, detail: "No live session manifest." };
  }
  if (!pidAlive(pid)) {
    return { online: false, detail: `Bridge pid ${pid} is not running.` };
  }
  return { online: true, detail: `Bridge running (pid ${pid}).` };
}

export async function loadLocalStudioLauncherData(): Promise<LocalStudioLauncherData> {
  const opsEnabled = process.env.RETROVERSE_OPS === "1";
  const [liveBridge, ollama, database] = await Promise.all([
    checkLiveBridge(),
    ollamaAvailable().then((online) => ({
      online,
      detail: online ? "Ollama responding on localhost:11434." : "Ollama is not reachable.",
    })),
    inspectPing().then((result) => ({
      online: result.ok,
      detail: result.ok ? "Postgres graph reachable." : (result.error ?? "Postgres offline."),
    })),
  ]);

  const services: LocalServiceStatus[] = [
    {
      id: "dev-server",
      label: "Dev Server",
      online: true,
      detail: `Next.js responding on localhost:${process.env.PORT?.trim() || "3000"}.`,
      nextAction: "Double-click Retroverse Studio.command to start the dev server.",
    },
    {
      id: "ops-env",
      label: "Ops Environment",
      online: opsEnabled,
      detail: opsEnabled
        ? "RETROVERSE_OPS=1 is set."
        : "RETROVERSE_OPS is not enabled for this dev server.",
      nextAction:
        "Restart dev with RETROVERSE_OPS=1 (Retroverse Studio.command sets this automatically).",
    },
    {
      id: "live-bridge",
      label: "Live Bridge",
      online: liveBridge.online,
      detail: liveBridge.detail,
      nextAction: "Run npm run live-now-playing or use Script Launcher → Diagnose Live.",
    },
    {
      id: "ollama",
      label: "Ollama",
      online: ollama.online,
      detail: ollama.detail,
      nextAction: "Open the Ollama app or run: ollama serve",
    },
    {
      id: "database",
      label: "Database",
      online: database.online,
      detail: database.detail,
      nextAction:
        "Start local Postgres (retroverse DB) or verify RETROVERSE_PG_* / DATABASE_URL settings.",
    },
  ];

  const offlineServices = services.filter((service) => !service.online);

  return {
    generatedAt: new Date().toISOString(),
    studioOnline: true,
    opsEnabled,
    services,
    offlineServices,
    links: {
      commandCenter: "/ops",
      atlasLibrary: "/ops/library",
      scriptLauncher: "/ops/atlas/scripts",
      systemMap: "/ops/atlas/system",
      architecture: "/ops/atlas/architecture",
      databaseExplorer: "/database-explorer",
      diagnoseLive: "/ops/atlas/scripts",
    },
  };
}
