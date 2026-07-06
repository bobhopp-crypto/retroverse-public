import "server-only";

import { buildRetroverseRuntimeStatus } from "./status";
import {
  LIVE_HEALTH_URL,
  LIVE_PORT,
  spawnDetachedLifecycle,
  STUDIO_PORT,
  VDJ_BRIDGE_COMMAND,
} from "./dev-control-internals";

export type {
  DevAppStatus,
  RetroverseRuntimeStatus,
  RuntimeHealthLevel,
  RuntimeServiceCheck,
  RuntimeServiceState,
} from "./types";

export async function getRetroverseRuntimeStatus() {
  return buildRetroverseRuntimeStatus(VDJ_BRIDGE_COMMAND, STUDIO_PORT, LIVE_PORT, LIVE_HEALTH_URL);
}

export async function startRetroverseRuntime() {
  spawnDetachedLifecycle("start");
}

export async function stopRetroverseRuntime() {
  spawnDetachedLifecycle("stop");
}

export async function restartRetroverseRuntime() {
  spawnDetachedLifecycle("restart");
}
