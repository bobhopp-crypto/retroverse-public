import "server-only";

import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

import { remoteStateGet, remoteStateSet } from "@/lib/sunday-nights/remote-state";
import { useRemoteSundayNightsState } from "@/lib/sunday-nights/storage-mode";

import { broadcastMediaContentType } from "./serve-media";
import { parseBroadcastMediaUrl, rewriteBroadcastMediaUrl, toPatronMediaUrl } from "./media-url";
import { collectionMastersDir, collectionThumbsDir } from "./store";
import type { BroadcastSnapshot } from "@/lib/bobos/presentation/types";
import { join } from "node:path";
import { existsSync } from "node:fs";

type RemoteBroadcastMediaRecord = {
  contentType: string;
  dataBase64: string;
  updatedAt: string;
};

let archivedMediaPromise: Promise<Record<string, RemoteBroadcastMediaRecord>> | null = null;

function archivedBroadcastMedia(): Promise<Record<string, RemoteBroadcastMediaRecord>> {
  if (!archivedMediaPromise) {
    archivedMediaPromise = readFile(join(process.cwd(), "data/static-graph/broadcast-media.json.gz"))
      .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as Record<string, RemoteBroadcastMediaRecord>)
      .catch((error) => { archivedMediaPromise = null; throw error; });
  }
  return archivedMediaPromise;
}

export function remoteBroadcastMediaKey(
  collectionId: string,
  kind: "masters" | "thumbs",
  filename: string,
): string {
  return `broadcast-media:${collectionId}:${kind}:${filename}`;
}

export async function saveRemoteBroadcastMedia(input: {
  collectionId: string;
  kind: "masters" | "thumbs";
  filename: string;
  contentType: string;
  dataBase64: string;
}): Promise<void> {
  const key = remoteBroadcastMediaKey(input.collectionId, input.kind, input.filename);
  const record: RemoteBroadcastMediaRecord = {
    contentType: input.contentType,
    dataBase64: input.dataBase64,
    updatedAt: new Date().toISOString(),
  };
  await remoteStateSet(key, record as unknown as Record<string, unknown>);
}

export async function loadRemoteBroadcastMedia(
  key: string,
): Promise<RemoteBroadcastMediaRecord | null> {
  const raw = await remoteStateGet<RemoteBroadcastMediaRecord>(key).catch(() => null)
    ?? (await archivedBroadcastMedia())[key] ?? null;
  if (!raw?.dataBase64 || !raw.contentType) return null;
  return raw;
}

function localMediaPath(
  collectionId: string,
  kind: "masters" | "thumbs",
  filename: string,
): string {
  const dir = kind === "masters" ? collectionMastersDir(collectionId) : collectionThumbsDir(collectionId);
  return join(dir, filename);
}

function collectMediaUrls(snapshot: BroadcastSnapshot): string[] {
  const urls = new Set<string>();
  for (const item of snapshot.queue.items) {
    const patron = toPatronMediaUrl(item.mediaUrl);
    if (patron) urls.add(patron);
  }
  return [...urls];
}

/** Push patron-sized thumb bytes to the deployed site so retroverse.live can
 * serve slides without access to the local RETROVERSE_DATA disk. */
export async function syncBroadcastMediaToPublic(
  snapshot: BroadcastSnapshot,
  publicBaseUrl: string,
  secret: string,
): Promise<void> {
  if (useRemoteSundayNightsState()) return;

  const urls = collectMediaUrls(snapshot);
  for (const url of urls) {
    const parsed = parseBroadcastMediaUrl(url);
    if (!parsed || parsed.kind !== "thumbs") continue;

    const abs = localMediaPath(parsed.collectionId, parsed.kind, parsed.filename);
    if (!existsSync(abs)) continue;

    const buffer = await readFile(abs);
    const endpoint = `${publicBaseUrl.replace(/\/$/, "")}${url}`;
    await fetch(endpoint, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": broadcastMediaContentType(parsed.filename),
      },
      body: buffer,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }).catch(() => undefined);
  }
}

export function rewriteSnapshotMediaUrls(snapshot: BroadcastSnapshot): BroadcastSnapshot {
  return {
    ...snapshot,
    queue: {
      ...snapshot.queue,
      items: snapshot.queue.items.map((item) => ({
        ...item,
        mediaUrl: toPatronMediaUrl(item.mediaUrl),
      })),
    },
  };
}
