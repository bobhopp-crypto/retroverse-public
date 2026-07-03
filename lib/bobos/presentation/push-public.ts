import "server-only";

import { usePostgresSundayNightsState } from "@/lib/sunday-nights/storage-mode";

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
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(snapshot),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { status: "rejected", detail: `HTTP ${res.status} from ${url}` };
    }
    return { status: "synced", detail: url };
  } catch (error) {
    return {
      status: "unreachable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
