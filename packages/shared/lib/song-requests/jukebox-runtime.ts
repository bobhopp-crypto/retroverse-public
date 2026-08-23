import "server-only";

import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

import type { JukeboxBridgeStatus } from "./jukebox-types";

const execFileAsync = promisify(execFile);
const LOCAL_BRIDGE_ENDPOINT = "http://127.0.0.1:3000/api/jukebox/accepted";
export const JUKEBOX_REQUEST_LIST_NAME = "JUKEBOX REQUESTS";

export type JukeboxRequestListEntry = {
  artist: string;
  title: string;
  localMediaPath: string;
};

type BridgeConfig = {
  enabled?: boolean;
  endpoint?: string;
  token?: string;
  outputPath?: string;
  notifications?: boolean;
  [key: string]: unknown;
};

function configPath(): string {
  return join(homedir(), ".hammerspoon", "retroverse_requests.json");
}

export function jukeboxRequestListPath(): string {
  return join(retroverseDataRoot(), "virtualdj-requests", `${JUKEBOX_REQUEST_LIST_NAME}.m3u`);
}

function cleanM3uText(value: string): string {
  return value.replace(/[\r\n]/g, " ");
}

function buildM3u(entries: JukeboxRequestListEntry[]): string {
  const lines = ["#EXTM3U"];
  for (const entry of entries) {
    if (!entry.localMediaPath.startsWith("/")) continue;
    lines.push(`#EXTINF:-1,${cleanM3uText(entry.artist)} - ${cleanM3uText(entry.title)}`);
    lines.push(cleanM3uText(entry.localMediaPath));
  }
  return `${lines.join("\n")}\n`;
}

export async function verifyJukeboxRequestListWritable(): Promise<void> {
  const path = jukeboxRequestListPath();
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const existing = await stat(path).catch(() => null);
  await access(existing ? path : directory, fsConstants.W_OK);
}

export async function writeJukeboxRequestList(entries: JukeboxRequestListEntry[]): Promise<void> {
  const path = jukeboxRequestListPath();
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, buildM3u(entries), { encoding: "utf8", mode: 0o644 });
  await rename(temporary, path);
}

async function readConfig(): Promise<BridgeConfig | null> {
  try {
    return JSON.parse(await readFile(configPath(), "utf8")) as BridgeConfig;
  } catch {
    return null;
  }
}

async function hammerspoonRunning(): Promise<boolean> {
  try {
    await execFileAsync("/usr/bin/pgrep", ["-x", "Hammerspoon"]);
    return true;
  } catch {
    return false;
  }
}

export async function loadJukeboxBridgeStatus(): Promise<JukeboxBridgeStatus> {
  const config = await readConfig();
  let outputUpdatedAt: string | null = null;
  if (typeof config?.outputPath === "string" && config.outputPath) {
    const outputStat = await stat(config.outputPath).catch(() => null);
    outputUpdatedAt = outputStat?.mtime.toISOString() ?? null;
  }
  return {
    running: await hammerspoonRunning(),
    enabled: config?.enabled === true,
    localEndpoint: config?.endpoint === LOCAL_BRIDGE_ENDPOINT,
    endpoint: typeof config?.endpoint === "string" ? config.endpoint : null,
    outputPath: typeof config?.outputPath === "string" ? config.outputPath : null,
    outputUpdatedAt,
  };
}

async function saveLocalBridgeConfig(): Promise<void> {
  const config = await readConfig();
  if (!config || typeof config.token !== "string" || !config.token.trim()) {
    throw new Error("The existing request bridge token is not configured.");
  }
  const next: BridgeConfig = {
    ...config,
    endpoint: LOCAL_BRIDGE_ENDPOINT,
    outputPath: jukeboxRequestListPath(),
    enabled: true,
  };
  const path = configPath();
  const temporary = `${path}.jukebox.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

async function waitForHammerspoon(): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await hammerspoonRunning()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Hammerspoon did not start.");
}

export async function startJukeboxBridge(): Promise<JukeboxBridgeStatus> {
  await saveLocalBridgeConfig();
  if (!(await hammerspoonRunning())) {
    await execFileAsync("/usr/bin/open", ["-gj", "-a", "Hammerspoon"]);
    await waitForHammerspoon();
  }
  const lua = "if retroverseRequests then retroverseRequests.enable(); retroverseRequests.pollNow(); return 'ok' else return 'request bridge unavailable' end";
  const script = `tell application \"Hammerspoon\" to execute lua code \"${lua}\"`;
  await execFileAsync("/usr/bin/osascript", ["-e", script]);
  await new Promise((resolve) => setTimeout(resolve, 750));
  return loadJukeboxBridgeStatus();
}

export async function pollJukeboxBridge(): Promise<JukeboxBridgeStatus> {
  if (!(await hammerspoonRunning())) return loadJukeboxBridgeStatus();
  const lua = "if retroverseRequests then retroverseRequests.pollNow(); return 'ok' else return 'request bridge unavailable' end";
  const script = `tell application \"Hammerspoon\" to execute lua code \"${lua}\"`;
  await execFileAsync("/usr/bin/osascript", ["-e", script]);
  return loadJukeboxBridgeStatus();
}

export { LOCAL_BRIDGE_ENDPOINT };
