import "server-only";

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { collectionMastersDir, collectionThumbsDir } from "./store";
import { loadRemoteBroadcastMedia, remoteBroadcastMediaKey } from "./media-remote";

const CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export function broadcastMediaContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE[ext] ?? "application/octet-stream";
}

function localMediaPath(
  collectionId: string,
  kind: "masters" | "thumbs",
  filename: string,
): string {
  const dir = kind === "masters" ? collectionMastersDir(collectionId) : collectionThumbsDir(collectionId);
  return join(dir, filename);
}

export type ServedBroadcastMedia =
  | { ok: true; buffer: Buffer; contentType: string; source: "disk" | "remote" }
  | { ok: false; status: 400 | 404; error: string };

export async function serveBroadcastMedia(
  collectionId: string,
  kind: "masters" | "thumbs",
  filename: string,
): Promise<ServedBroadcastMedia> {
  if (filename.includes("/") || filename.includes("..")) {
    return { ok: false, status: 400, error: "invalid_filename" };
  }

  const abs = localMediaPath(collectionId, kind, filename);
  if (existsSync(abs)) {
    const buffer = await readFile(abs);
    return {
      ok: true,
      buffer,
      contentType: broadcastMediaContentType(filename),
      source: "disk",
    };
  }

  const remote = await loadRemoteBroadcastMedia(remoteBroadcastMediaKey(collectionId, kind, filename));
  if (remote) {
    return {
      ok: true,
      buffer: Buffer.from(remote.dataBase64, "base64"),
      contentType: remote.contentType,
      source: "remote",
    };
  }

  return { ok: false, status: 404, error: "file_missing" };
}
