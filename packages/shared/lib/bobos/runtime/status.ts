import "server-only";

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";
import {
  readBridgePublicPushDiagnostics,
  publicSiteBaseUrl,
} from "@/lib/bobos/presentation/push-public";
import { tickLiveControl } from "@/lib/live-control/engine";
import { loadLiveControlState } from "@/lib/live-control/state";
import { ollamaAvailable } from "@/lib/ops/intelligence/ollama-client";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";
import {
  buildSundayNightsCurrentPayload,
  type SundayNightsCurrentPayload,
} from "@/lib/sunday-nights/live-payload";
import { fetchDeployPreview } from "@/lib/sunday-nights/system/deploy";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { isBridgeProcessRunning } from "@/lib/sunday-nights/bridge-status";

import {
  liveAppStatus,
  readDevOwnershipForSuffix,
  repoRoot,
  studioAppStatus,
} from "./dev-control-internals";
import type {
  DeploymentRecommendation,
  DevAppStatus,
  LiveMonitorSnapshot,
  LiveSyncStatus,
  RetroverseRuntimeStatus,
  RuntimeDiagnostics,
  RuntimeHealthLevel,
  RuntimeServiceCheck,
  RuntimeServiceState,
  RuntimeSummary,
} from "./types";

const PUBLIC_FETCH_TTL_MS = 10_000;
let publicLiveCache: { at: number; payload: SundayNightsCurrentPayload | null; error: string | null } | null =
  null;

type ProbeResult = {
  ok: boolean;
  responseMs: number | null;
  checkedAt: string;
};

async function probeUrl(url: string): Promise<ProbeResult> {
  const checkedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(4_000),
      headers: { Accept: "application/json,text/html,*/*" },
      cache: "no-store",
    });
    return { ok: res.status < 500, responseMs: Date.now() - start, checkedAt };
  } catch {
    return { ok: false, responseMs: Date.now() - start, checkedAt };
  }
}

function statusLabel(state: RuntimeServiceState): string {
  switch (state) {
    case "running":
      return "Running";
    case "starting":
      return "Starting…";
    case "connected":
      return "Connected";
    case "waiting":
      return "Waiting";
    case "unavailable":
      return "Unavailable";
    default:
      return "Stopped";
  }
}

function serviceCheck(input: {
  id: string;
  label: string;
  state: RuntimeServiceState;
  url?: string | null;
  probe?: ProbeResult;
}): RuntimeServiceCheck {
  return {
    id: input.id,
    label: input.label,
    state: input.state,
    statusLabel: statusLabel(input.state),
    url: input.url ?? null,
    lastHealthCheck: input.probe?.checkedAt ?? null,
    responseMs: input.probe?.responseMs ?? null,
  };
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeRvtr(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

function monitorFromPayload(
  payload: SundayNightsCurrentPayload | null,
  url: string,
  reachable: boolean,
  error: string | null,
): LiveMonitorSnapshot {
  const live = payload?.live ?? null;
  const track = payload?.track ?? null;
  return {
    song: live?.title ?? track?.title ?? null,
    artist: live?.artist ?? track?.artistName ?? null,
    rvtr: normalizeRvtr(payload?.currentTrackId) || normalizeRvtr(live?.rvtr) || null,
    updatedAt: payload?.updatedAt ?? live?.bridgeTimestamp ?? null,
    url,
    coverUrl: live?.coverUrl ?? track?.coverUrl ?? null,
    destinationKind: payload?.destination?.kind ?? null,
    reachable,
    error,
  };
}

async function loadLocalLiveMonitor(): Promise<LiveMonitorSnapshot> {
  const localUrl = "http://localhost:3100/live";
  try {
    await tickLiveControl();
    const [state, control] = await Promise.all([loadSundayNightsState(), loadLiveControlState()]);
    const payload = await buildSundayNightsCurrentPayload(state, control);
    return monitorFromPayload(payload, localUrl, true, null);
  } catch (error) {
    return monitorFromPayload(null, localUrl, false, error instanceof Error ? error.message : String(error));
  }
}

async function loadPublicLiveMonitor(force = false): Promise<LiveMonitorSnapshot> {
  const publicUrl = `${publicSiteBaseUrl()}/live`;
  const now = Date.now();
  if (!force && publicLiveCache && now - publicLiveCache.at < PUBLIC_FETCH_TTL_MS) {
    return monitorFromPayload(
      publicLiveCache.payload,
      publicUrl,
      publicLiveCache.payload !== null,
      publicLiveCache.error,
    );
  }

  const apiUrl = `${publicSiteBaseUrl()}/api/sunday-nights/current`;
  try {
    const res = await fetch(apiUrl, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!res.ok) {
      const error = `HTTP ${res.status} from ${apiUrl}`;
      publicLiveCache = { at: now, payload: null, error };
      return monitorFromPayload(null, publicUrl, false, error);
    }
    const payload = (await res.json()) as SundayNightsCurrentPayload;
    publicLiveCache = { at: now, payload, error: null };
    return monitorFromPayload(payload, publicUrl, true, null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    publicLiveCache = { at: now, payload: null, error: message };
    return monitorFromPayload(null, publicUrl, false, message);
  }
}

function compareLiveSync(local: LiveMonitorSnapshot, pub: LiveMonitorSnapshot): LiveSyncStatus {
  if (!local.reachable || !pub.reachable) {
    const differences: string[] = [];
    if (!local.reachable) differences.push("Local live state unavailable");
    if (!pub.reachable) differences.push("Public live state unavailable");
    return {
      inSync: differences.length === 0,
      label: differences.length === 0 ? "IN SYNC" : "OUT OF SYNC",
      differences,
    };
  }

  const differences: string[] = [];
  if (normalizeText(local.song) !== normalizeText(pub.song)) differences.push("Different song");
  if (normalizeText(local.artist) !== normalizeText(pub.artist)) differences.push("Different artist");
  if (normalizeRvtr(local.rvtr) !== normalizeRvtr(pub.rvtr)) differences.push("Different RVTR");
  if ((local.updatedAt ?? "") !== (pub.updatedAt ?? "")) differences.push("Different timestamp");
  if ((local.destinationKind ?? "") !== (pub.destinationKind ?? "")) differences.push("Different package");

  return {
    inSync: differences.length === 0,
    label: differences.length === 0 ? "IN SYNC" : "OUT OF SYNC",
    differences,
  };
}

type LocalGit = {
  fullSha: string;
  shortSha: string;
  dirty: boolean;
};

function readLocalGit(): LocalGit | null {
  const root = repoRoot();
  try {
    const fullSha = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
    const dirty =
      execSync("git status --porcelain", { cwd: root, encoding: "utf8" }).trim().length > 0;
    return { fullSha, shortSha: fullSha.slice(0, 7), dirty };
  } catch {
    return null;
  }
}

async function assessDeployment(): Promise<DeploymentRecommendation> {
  const local = readLocalGit();
  const preview = await fetchDeployPreview();
  const productionCommit = preview.commit === "unknown" ? null : preview.commit;
  const differs =
    Boolean(local) &&
    Boolean(productionCommit) &&
    (local!.fullSha.slice(0, 7) !== productionCommit || local!.dirty);

  return {
    required: Boolean(differs),
    message: differs ? "Deployment recommended." : "No deployment required.",
    localCommit: local?.shortSha ?? null,
    productionCommit,
    dirty: local?.dirty ?? false,
  };
}

function readBridgeLogStats(): { reconnectCount: number; oscErrors: number } {
  const logPath = path.join(
    retroverseDataRoot(),
    "live",
    `bridge-${new Date().toISOString().slice(0, 10)}.log`,
  );
  if (!existsSync(logPath)) return { reconnectCount: 0, oscErrors: 0 };

  let reconnectCount = 0;
  let oscErrors = 0;
  for (const line of readFileSync(logPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as { event?: string };
      if (parsed.event === "bridge_start") reconnectCount += 1;
      if (parsed.event === "vdj_error") oscErrors += 1;
    } catch {
      /* ignore malformed lines */
    }
  }
  return { reconnectCount, oscErrors };
}

function readStartupDiagnostics(): {
  startupLog: string[];
  healthFailures: string[];
  startupTimeMs: number | null;
  lastStartup: string | null;
} {
  const logPath = path.join(repoRoot(), "logs", "retroverse-startup.log");
  if (!existsSync(logPath)) {
    return { startupLog: [], healthFailures: [], startupTimeMs: null, lastStartup: null };
  }

  const lines = readFileSync(logPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const recent = lines.slice(-12);
  const healthFailures = lines.filter((line) => line.includes("status=FAILED"));
  const last = lines.at(-1) ?? null;
  const durationMatch = last?.match(/duration=([\d.]+)s/);
  const timestampMatch = last?.match(/timestamp=([^\s]+)/);
  return {
    startupLog: recent,
    healthFailures: healthFailures.slice(-8),
    startupTimeMs: durationMatch ? Math.round(Number(durationMatch[1]) * 1000) : null,
    lastStartup: timestampMatch?.[1] ?? null,
  };
}

async function fetchLastDeploymentTime(): Promise<string | null> {
  const repo = process.env.GITHUB_REPO?.trim() || "bobhopp-crypto/retroverse-public";
  const branch = process.env.GITHUB_DEPLOY_BRANCH?.trim() || "main";
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { commit?: { committer?: { date?: string } } };
    return data.commit?.committer?.date ?? null;
  } catch {
    return null;
  }
}

function latestStartedAt(studio: DevAppStatus, live: DevAppStatus): string | null {
  const candidates = [studio.startedAt, live.startedAt].filter(Boolean) as string[];
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

function formatUptimeSeconds(startedAt: string | null): number | null {
  if (!startedAt) return null;
  const startedMs = Date.parse(startedAt);
  if (!Number.isFinite(startedMs)) return null;
  return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
}

function deriveHealthLevel(services: RuntimeServiceCheck[], scope: "development" | "production"): RuntimeHealthLevel {
  const scoped =
    scope === "development"
      ? services.filter((svc) => svc.id !== "live-public" && svc.id !== "ollama")
      : services.filter((svc) => svc.id === "live-public");

  if (scoped.length === 0) return "unknown";
  const critical = scoped.filter((svc) => svc.id !== "broadcast");
  const allCriticalUp = critical.every((svc) => svc.state === "running" || svc.state === "connected");
  const anyDown = critical.some((svc) => svc.state === "stopped" || svc.state === "unavailable");
  if (anyDown) return "down";
  if (!allCriticalUp) return "degraded";
  return "healthy";
}

function deriveOverallHealth(summary: Pick<RuntimeSummary, "development" | "production">): RuntimeHealthLevel {
  if (summary.development === "down" || summary.production === "down") return "down";
  if (summary.development === "degraded" || summary.production === "degraded") return "degraded";
  if (summary.development === "unknown" && summary.production === "unknown") return "unknown";
  return "healthy";
}

export async function buildRetroverseRuntimeStatus(
  vdjBridgeCommand: string,
  studioPort: number,
  livePort: number,
  liveHealthUrl: string,
): Promise<RetroverseRuntimeStatus> {
  const checkedAt = new Date().toISOString();
  const bridgeRunning = isBridgeProcessRunning();

  const [
    live,
    playhead,
    ollamaOnline,
    localMonitor,
    publicMonitor,
    deployment,
    lastDeploymentTime,
    startupDiagnostics,
    bridgeLogStats,
  ] = await Promise.all([
    liveAppStatus(readDevOwnershipForSuffix("-live"), liveHealthUrl),
    buildPlayheadPayload().catch(() => null),
    ollamaAvailable().catch(() => false),
    loadLocalLiveMonitor(),
    loadPublicLiveMonitor(),
    assessDeployment(),
    fetchLastDeploymentTime(),
    Promise.resolve(readStartupDiagnostics()),
    Promise.resolve(readBridgeLogStats()),
  ]);

  const studio = studioAppStatus(readDevOwnershipForSuffix(""), studioPort);
  const lastStarted = latestStartedAt(studio, live);
  const uptimeSeconds = formatUptimeSeconds(lastStarted);

  const [studioProbe, liveProbe, publicProbe, ollamaProbe] = await Promise.all([
    Promise.resolve({
      ok: true,
      responseMs: 0,
      checkedAt,
    } satisfies ProbeResult),
    probeUrl(liveHealthUrl),
    probeUrl(publicSiteBaseUrl()),
    probeUrl(
      `${process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434"}/api/tags`,
    ),
  ]);

  const broadcastRunning = Boolean(playhead?.onAir);
  const oscConnected = bridgeRunning;
  const vdjConnected = bridgeRunning;

  const services: RuntimeServiceCheck[] = [
    serviceCheck({
      id: "bobos",
      label: "BobOS",
      state: studio.state,
      url: `http://localhost:${studioPort}`,
      probe: studioProbe,
    }),
    serviceCheck({
      id: "live-local",
      label: "Live Local",
      state: live.state,
      url: `http://localhost:${livePort}`,
      probe: liveProbe,
    }),
    serviceCheck({
      id: "live-public",
      label: "Live Public",
      state: publicMonitor.reachable ? "running" : "stopped",
      url: publicSiteBaseUrl(),
      probe: publicProbe,
    }),
    serviceCheck({
      id: "vdj-bridge",
      label: "VirtualDJ Bridge",
      state: bridgeRunning ? "running" : "stopped",
      url: null,
      probe: {
        ok: bridgeRunning,
        responseMs: null,
        checkedAt,
      },
    }),
    serviceCheck({
      id: "osc",
      label: "OSC",
      state: oscConnected ? "connected" : "waiting",
      url: null,
      probe: {
        ok: oscConnected,
        responseMs: null,
        checkedAt,
      },
    }),
    serviceCheck({
      id: "broadcast",
      label: "Broadcast",
      state: broadcastRunning ? "running" : "waiting",
      url: "http://localhost:3000/bobos",
      probe: {
        ok: broadcastRunning,
        responseMs: null,
        checkedAt,
      },
    }),
    serviceCheck({
      id: "ollama",
      label: "Ollama",
      state: ollamaOnline ? "running" : "unavailable",
      url: process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434",
      probe: ollamaProbe,
    }),
  ];

  const sync = compareLiveSync(localMonitor, publicMonitor);
  const development = deriveHealthLevel(services, "development");
  const production = deriveHealthLevel(services, "production");
  const summary: RuntimeSummary = {
    development,
    production,
    overallHealth: deriveOverallHealth({ development, production }),
    startupTimeMs: startupDiagnostics.startupTimeMs,
    lastStartup: startupDiagnostics.lastStartup ?? lastStarted,
    uptimeSeconds,
  };

  const bridgePublicPush = readBridgePublicPushDiagnostics();

  const diagnostics: RuntimeDiagnostics = {
    startupLog: startupDiagnostics.startupLog,
    healthFailures: startupDiagnostics.healthFailures,
    bridgeReconnectCount: bridgeLogStats.reconnectCount,
    oscErrors: bridgeLogStats.oscErrors,
    lastDeploymentTime,
    bridgePublicPush: bridgePublicPush
      ? {
          status: bridgePublicPush.status,
          detail: bridgePublicPush.detail,
          destination: bridgePublicPush.destination,
          httpStatus: bridgePublicPush.httpStatus,
          at: bridgePublicPush.at,
        }
      : null,
  };

  return {
    summary,
    services,
    liveMonitor: {
      local: localMonitor,
      public: publicMonitor,
      sync,
    },
    deployment,
    diagnostics,
    studio,
    live,
    broadcast: broadcastRunning ? "running" : "waiting",
    osc: oscConnected ? "connected" : "waiting",
    virtualdj: vdjConnected ? "connected" : "waiting",
    vdjBridgeRunning: bridgeRunning,
    vdjBridgeCommand,
    studioUrl: `localhost:${studioPort}`,
    liveUrl: `localhost:${livePort}`,
    lastStarted,
    uptimeSeconds,
    checkedAt,
  };
}
