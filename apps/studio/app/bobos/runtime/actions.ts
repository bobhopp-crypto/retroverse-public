"use server";

import {
  getRetroverseRuntimeStatus,
  restartRetroverseRuntime,
  startRetroverseRuntime,
  stopRetroverseRuntime,
  type RetroverseRuntimeStatus,
} from "@/lib/bobos/runtime/dev-control";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("Runtime is localhost-only.");
  }
}

export async function fetchRetroverseRuntimeStatus(): Promise<RetroverseRuntimeStatus> {
  assertLocalStudio();
  return getRetroverseRuntimeStatus();
}

export async function runtimeStart(): Promise<RetroverseRuntimeStatus> {
  assertLocalStudio();
  await startRetroverseRuntime();
  return getRetroverseRuntimeStatus();
}

export async function runtimeRestart(): Promise<RetroverseRuntimeStatus> {
  assertLocalStudio();
  await restartRetroverseRuntime();
  return getRetroverseRuntimeStatus();
}

export async function runtimeStop(): Promise<RetroverseRuntimeStatus> {
  assertLocalStudio();
  await stopRetroverseRuntime();
  return getRetroverseRuntimeStatus();
}

export type {
  RetroverseRuntimeStatus,
  RuntimeHealthLevel,
  RuntimeServiceCheck,
} from "@/lib/bobos/runtime/dev-control";
