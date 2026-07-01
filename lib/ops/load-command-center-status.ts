import "server-only";

import {
  isBridgeProcessRunning,
  loadBridgeProcessManifest,
} from "@/lib/sunday-nights/bridge-status";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { inspectPing } from "@/lib/inspect/pg";

export type CommandCenterStatus = {
  systemLabel: string;
  systemOk: boolean;
  vdjBridgeLabel: string;
  vdjBridgeOk: boolean;
  bridgeHeartbeat: string | null;
  liveLabel: string;
  liveActive: boolean;
  liveRvtr: string | null;
  liveBridgeTimestamp: string | null;
  updatedAt: string;
};

export async function loadCommandCenterStatus(): Promise<CommandCenterStatus> {
  const [dbPing, sundayNights, manifest] = await Promise.all([
    inspectPing(),
    loadSundayNightsState(),
    Promise.resolve(loadBridgeProcessManifest()),
  ]);

  const systemOk = process.env.RETROVERSE_OPS === "1" && dbPing.ok;
  const vdjBridgeOk = isBridgeProcessRunning();
  const liveActive = Boolean(sundayNights.live?.artist && sundayNights.live?.title);
  const liveLabel = liveActive
    ? `${sundayNights.live!.artist} — ${sundayNights.live!.title}`
    : sundayNights.currentTrackId
      ? `Last track ${sundayNights.currentTrackId}`
      : "No Active Show";

  return {
    systemOk,
    systemLabel: systemOk ? "All Systems Operational" : "Needs Attention",
    vdjBridgeOk,
    vdjBridgeLabel: vdjBridgeOk ? "Connected" : "Offline",
    bridgeHeartbeat:
      sundayNights.live?.bridgeTimestamp ??
      manifest?.startedAt ??
      sundayNights.updatedAt ??
      null,
    liveActive,
    liveLabel,
    liveRvtr: sundayNights.live?.rvtr ?? sundayNights.currentTrackId ?? null,
    liveBridgeTimestamp: sundayNights.live?.bridgeTimestamp ?? null,
    updatedAt: sundayNights.updatedAt ?? new Date().toISOString(),
  };
}
