/**
 * Booth ← Runtime health adapter (Sprint 3).
 * One-way information only. Never mutates Booth Store / ownership.
 */

import type { RetroverseRuntimeStatus, RuntimeServiceCheck } from "@/lib/bobos/runtime/types";

import { emptyBoothVdjSourceView, type BoothVdjSourceView } from "./vdj-source";

/** Lamp / row tone — never invent "on" without a positive signal. */
export type BoothSignalTone =
  | "on"
  | "off"
  | "unknown"
  | "offline"
  | "disconnected"
  | "fault";

export type BoothMonitorRow = {
  id: string;
  label: string;
  value: string;
  tone: BoothSignalTone;
};

export type BoothConfidenceDisplay = "Unknown" | "Confirmed" | "Unconfirmed" | "Fault" | "Offline";

export type BoothRuntimeHealth = {
  /** True after at least one successful Runtime fetch. */
  ready: boolean;
  error: string | null;
  checkedAt: string | null;
  lamps: {
    runtime: BoothSignalTone;
    vdjConnected: BoothSignalTone;
    vdjPlaying: BoothSignalTone;
    audience: BoothSignalTone;
  };
  monitors: BoothMonitorRow[];
  localConfidence: BoothConfidenceDisplay;
  publicConfidence: BoothConfidenceDisplay;
  /** Observed VirtualDJ Source (Sprint 4) — not Booth ownership. */
  vdj: BoothVdjSourceView;
};

/** Minimal broadcast read model — ownership fields intentionally omitted. */
export type BoothBroadcastHealthInput = {
  vdjPlaying: boolean | null;
  publicSync: "synced" | "drift" | "unreachable" | "unconfigured" | "off-air" | null;
  publicSyncDetail: string | null;
};

export function emptyBoothRuntimeHealth(error: string | null = null): BoothRuntimeHealth {
  return {
    ready: false,
    error,
    checkedAt: null,
    lamps: {
      runtime: "unknown",
      vdjConnected: "unknown",
      vdjPlaying: "unknown",
      audience: "unknown",
    },
    monitors: [
      { id: "runtime", label: "Runtime", value: "Unknown", tone: "unknown" },
      { id: "bridge", label: "Bridge", value: "Unknown", tone: "unknown" },
      { id: "osc", label: "OSC", value: "Unknown", tone: "unknown" },
      { id: "broadcast", label: "Broadcast", value: "Unknown", tone: "unknown" },
      { id: "public", label: "Public", value: "Unknown", tone: "unknown" },
    ],
    localConfidence: "Unknown",
    publicConfidence: "Unknown",
    vdj: emptyBoothVdjSourceView(),
  };
}

function serviceById(
  runtime: RetroverseRuntimeStatus,
  id: string,
): RuntimeServiceCheck | undefined {
  return runtime.services.find((service) => service.id === id);
}

function runtimeLamp(runtime: RetroverseRuntimeStatus): BoothSignalTone {
  switch (runtime.summary.overallHealth) {
    case "healthy":
      return "on";
    case "degraded":
      return "fault";
    case "down":
      return "offline";
    case "unknown":
    default:
      return "unknown";
  }
}

function runtimeValue(runtime: RetroverseRuntimeStatus): string {
  switch (runtime.summary.overallHealth) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "down":
      return "Offline";
    case "unknown":
    default:
      return "Unknown";
  }
}

function bridgeTone(runtime: RetroverseRuntimeStatus): BoothSignalTone {
  if (runtime.vdjBridgeRunning || runtime.virtualdj === "connected") return "on";
  return "disconnected";
}

function oscTone(runtime: RetroverseRuntimeStatus): BoothSignalTone {
  if (runtime.osc === "connected") return "on";
  return "disconnected";
}

function broadcastTone(runtime: RetroverseRuntimeStatus): BoothSignalTone {
  if (runtime.broadcast === "running") return "on";
  return "off";
}

function publicEndpointTone(runtime: RetroverseRuntimeStatus): BoothSignalTone {
  if (runtime.liveMonitor.public.reachable) return "on";
  if (runtime.liveMonitor.public.error) return "offline";
  const livePublic = serviceById(runtime, "live-public");
  if (livePublic?.state === "unavailable") return "offline";
  return "unknown";
}

function audienceFromBroadcast(
  broadcast: BoothBroadcastHealthInput | null,
  runtime: RetroverseRuntimeStatus | null,
): { tone: BoothSignalTone; confidence: BoothConfidenceDisplay; detail: string } {
  if (!broadcast || broadcast.publicSync == null) {
    if (runtime?.liveMonitor.public.reachable) {
      return {
        tone: "off",
        confidence: "Unconfirmed",
        detail: "Public reachable — sync Unknown",
      };
    }
    return { tone: "unknown", confidence: "Unknown", detail: "Unknown" };
  }

  switch (broadcast.publicSync) {
    case "synced":
      return {
        tone: "on",
        confidence: "Confirmed",
        detail: broadcast.publicSyncDetail ?? "Synced",
      };
    case "drift":
      return {
        tone: "fault",
        confidence: "Fault",
        detail: broadcast.publicSyncDetail ?? "Drift",
      };
    case "unreachable":
      return {
        tone: "disconnected",
        confidence: "Offline",
        detail: broadcast.publicSyncDetail ?? "Unreachable",
      };
    case "unconfigured":
      return {
        tone: "unknown",
        confidence: "Unknown",
        detail: broadcast.publicSyncDetail ?? "Unconfigured",
      };
    case "off-air":
      return {
        tone: "off",
        confidence: runtime?.liveMonitor.public.reachable ? "Unconfirmed" : "Unknown",
        detail: broadcast.publicSyncDetail ?? "Off air",
      };
    default:
      return { tone: "unknown", confidence: "Unknown", detail: "Unknown" };
  }
}

function localConfidence(runtime: RetroverseRuntimeStatus): BoothConfidenceDisplay {
  if (runtime.live.healthy || runtime.liveMonitor.local.reachable) return "Confirmed";
  if (runtime.live.state === "stopped" || runtime.live.state === "unavailable") return "Offline";
  return "Unknown";
}

function vdjPlayingTone(broadcast: BoothBroadcastHealthInput | null): BoothSignalTone {
  if (!broadcast || broadcast.vdjPlaying == null) return "unknown";
  return broadcast.vdjPlaying ? "on" : "off";
}

/** Map live Runtime (+ optional Broadcast status) → Booth health view. */
export function mapBoothRuntimeHealth(input: {
  runtime: RetroverseRuntimeStatus | null;
  broadcast?: BoothBroadcastHealthInput | null;
  error?: string | null;
  /** Observed VirtualDJ Source — mapped separately; never invents identity. */
  vdj?: BoothVdjSourceView | null;
}): BoothRuntimeHealth {
  const { runtime, broadcast = null, error = null, vdj = null } = input;

  if (!runtime) {
    const empty = emptyBoothRuntimeHealth(error);
    return vdj ? { ...empty, vdj } : empty;
  }

  const audience = audienceFromBroadcast(broadcast, runtime);
  const bridge = bridgeTone(runtime);
  const osc = oscTone(runtime);
  const publicEndpoint = publicEndpointTone(runtime);

  return {
    ready: true,
    error,
    checkedAt: runtime.checkedAt,
    lamps: {
      runtime: runtimeLamp(runtime),
      vdjConnected: bridge,
      vdjPlaying: vdjPlayingTone(broadcast),
      audience: audience.tone,
    },
    monitors: [
      {
        id: "runtime",
        label: "Runtime",
        value: runtimeValue(runtime),
        tone: runtimeLamp(runtime),
      },
      {
        id: "bridge",
        label: "Bridge",
        value: runtime.vdjBridgeRunning ? "Connected" : "Disconnected",
        tone: bridge,
      },
      {
        id: "osc",
        label: "OSC",
        value: runtime.osc === "connected" ? "Connected" : "Disconnected",
        tone: osc,
      },
      {
        id: "broadcast",
        label: "Broadcast",
        value: runtime.broadcast === "running" ? "Running" : "Waiting",
        tone: broadcastTone(runtime),
      },
      {
        id: "public",
        label: "Public",
        value: runtime.liveMonitor.public.reachable
          ? "Reachable"
          : runtime.liveMonitor.public.error
            ? "Offline"
            : "Unknown",
        tone: publicEndpoint,
      },
    ],
    localConfidence: localConfidence(runtime),
    publicConfidence: audience.confidence,
    vdj: vdj ?? emptyBoothVdjSourceView(),
  };
}

export function boothSignalLabel(tone: BoothSignalTone): string {
  switch (tone) {
    case "on":
      return "On";
    case "off":
      return "Off";
    case "unknown":
      return "Unknown";
    case "offline":
      return "Offline";
    case "disconnected":
      return "Disconnected";
    case "fault":
      return "Fault";
    default:
      return "Unknown";
  }
}
