import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { BridgeLivePostBody } from "@/lib/sunday-nights/types";
import { usePostgresSundayNightsState } from "@/lib/sunday-nights/storage-mode";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

import type { BroadcastSnapshot } from "./types";

/**
 * Push the Broadcast Snapshot from the local studio to the deployed site.
 *
 * Same trust model as the VirtualDJ bridge: shared secret in
 * LIVE_NOW_PLAYING_SECRET, target from RETROVERSE_LIVE_PUBLIC_URL
 * (default https://retroverse.live). Failure is never fatal — the local
 * broadcast keeps running and the panel reports the public site status.
 */

export type PublicPushResult = {
  status: "synced" | "unconfigured" | "unreachable" | "rejected";
  detail: string;
};

export type BridgePublicPushResult = PublicPushResult & {
  destination: string | null;
  httpStatus: number | null;
  at: string;
};

let lastBridgePublicPush: BridgePublicPushResult | null = null;

function bridgePublicPushDiagnosticsPath(): string {
  return join(retroverseDataRoot(), "live", "bridge-public-push.json");
}

async function persistBridgePublicPushDiagnostics(
  result: BridgePublicPushResult,
): Promise<void> {
  if (process.env.VERCEL === "1") return;
  try {
    const dir = join(retroverseDataRoot(), "live");
    await mkdir(dir, { recursive: true });
    await writeFile(
      bridgePublicPushDiagnosticsPath(),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    console.error("[bridge-public-push] failed to persist diagnostics", error);
  }
}

export function readBridgePublicPushDiagnostics(): BridgePublicPushResult | null {
  if (lastBridgePublicPush) return lastBridgePublicPush;
  const path = bridgePublicPushDiagnosticsPath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as BridgePublicPushResult;
    lastBridgePublicPush = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function publicSiteBaseUrl(): string {
  const raw = process.env.RETROVERSE_LIVE_PUBLIC_URL?.trim();
  return (raw || "https://retroverse.live").replace(/\/$/, "");
}

export async function pushBroadcastToPublic(
  snapshot: BroadcastSnapshot,
): Promise<PublicPushResult> {
  // On the deployed site itself the ingest route already wrote to Postgres.
  if (usePostgresSundayNightsState()) {
    return { status: "synced", detail: "Direct Postgres write" };
  }

  const secret = process.env.LIVE_NOW_PLAYING_SECRET?.trim();
  if (!secret) {
    return { status: "unconfigured", detail: "LIVE_NOW_PLAYING_SECRET not set" };
  }

  const url = `${publicSiteBaseUrl()}/api/retroverse-live/broadcast`;
  const { rewriteSnapshotMediaUrls, syncBroadcastMediaToPublic } = await import(
    "@/lib/bobos/importer/media-remote"
  );
  const snapshotForPublic = rewriteSnapshotMediaUrls(snapshot);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(snapshotForPublic),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { status: "rejected", detail: `HTTP ${res.status} from ${url}` };
    }
    await syncBroadcastMediaToPublic(snapshotForPublic, publicSiteBaseUrl(), secret).catch(() => undefined);
    return { status: "synced", detail: url };
  } catch (error) {
    return {
      status: "unreachable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Forward a VirtualDJ bridge payload from local Live to the deployed site.
 *
 * Same trust model as pushBroadcastToPublic — skipped on Vercel where the
 * ingest route writes directly to Postgres.
 */
export async function pushBridgeLiveUpdateToPublic(
  body: BridgeLivePostBody,
): Promise<BridgePublicPushResult> {
  const at = new Date().toISOString();

  const record = (
    result: Omit<BridgePublicPushResult, "at">,
  ): BridgePublicPushResult => {
    const full = { ...result, at };
    lastBridgePublicPush = full;
    void persistBridgePublicPushDiagnostics(full);
    return full;
  };

  if (usePostgresSundayNightsState()) {
    return record({
      status: "synced",
      detail: "Direct Postgres write",
      destination: null,
      httpStatus: null,
    });
  }

  const secret = process.env.LIVE_NOW_PLAYING_SECRET?.trim();
  if (!secret) {
    return record({
      status: "unconfigured",
      detail: "LIVE_NOW_PLAYING_SECRET not set",
      destination: null,
      httpStatus: null,
    });
  }

  const url = `${publicSiteBaseUrl()}/api/sunday-nights/bridge`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const detail = `HTTP ${res.status} from ${url}${text ? `: ${text.slice(0, 120)}` : ""}`;
      console.error("[bridge-public-push]", detail);
      return record({
        status: "rejected",
        detail,
        destination: url,
        httpStatus: res.status,
      });
    }
    return record({
      status: "synced",
      detail: url,
      destination: url,
      httpStatus: res.status,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[bridge-public-push]", detail, url);
    return record({
      status: "unreachable",
      detail,
      destination: url,
      httpStatus: null,
    });
  }
}
