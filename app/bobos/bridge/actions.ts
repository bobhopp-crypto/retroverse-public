"use server";

import { revalidatePath } from "next/cache";

import { applyBridgeVisualAction } from "@/lib/bobos/bridge/apply-visual-action";
import {
  defaultBridgeRvtr,
  loadBridgeView,
  resolveBridgeLiveRvtr,
} from "@/lib/bobos/bridge/load-bridge-view";
import type { BridgeSongModel, BridgeVisualAction } from "@/lib/bobos/bridge/types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("Bridge View is localhost-only.");
  }
}

export async function fetchBridgeView(rvtr: string): Promise<BridgeSongModel | null> {
  assertLocalStudio();
  return loadBridgeView(rvtr);
}

export async function fetchBridgeLiveRvtr() {
  assertLocalStudio();
  return resolveBridgeLiveRvtr();
}

export async function fetchDefaultBridgeRvtr(): Promise<string | null> {
  assertLocalStudio();
  return defaultBridgeRvtr();
}

export async function runBridgeVisualAction(
  rvtr: string,
  action: BridgeVisualAction,
): Promise<BridgeSongModel | null> {
  assertLocalStudio();
  await applyBridgeVisualAction(rvtr, action);
  revalidatePath("/bobos/bridge");
  return loadBridgeView(rvtr);
}

export async function refreshBridgeView(rvtr: string): Promise<BridgeSongModel | null> {
  assertLocalStudio();
  return loadBridgeView(rvtr);
}
