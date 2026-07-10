/** Patron-facing broadcast slide media — works on Studio and retroverse.live. */
export const BROADCAST_MEDIA_API_PREFIX = "/api/retroverse-live/broadcast-media";

const LEGACY_OPS_MEDIA_PREFIX = "/api/ops/bobos/broadcast-collections/";

export function slideMediaUrl(
  collectionId: string,
  kind: "masters" | "thumbs",
  filename: string,
): string {
  return `${BROADCAST_MEDIA_API_PREFIX}/${encodeURIComponent(collectionId)}/${kind}/${encodeURIComponent(filename)}`;
}

/** Rewrite legacy ops-only media paths to the patron-facing route. */
export function rewriteBroadcastMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(BROADCAST_MEDIA_API_PREFIX)) return url;
  if (url.startsWith(LEGACY_OPS_MEDIA_PREFIX)) {
    return url.replace(LEGACY_OPS_MEDIA_PREFIX, `${BROADCAST_MEDIA_API_PREFIX}/`);
  }
  return url;
}

/**
 * Patron surfaces (retroverse.live) use thumbnails — masters can exceed
 * serverless upload limits and are unnecessary on phone screens.
 */
export function toPatronMediaUrl(url: string | null | undefined): string | null {
  const rewritten = rewriteBroadcastMediaUrl(url);
  if (!rewritten) return null;
  if (!rewritten.includes("/masters/")) return rewritten;
  return rewritten.replace("/masters/", "/thumbs/").replace(/\.png$/i, ".jpg");
}

export function parseBroadcastMediaUrl(
  url: string,
): { collectionId: string; kind: "masters" | "thumbs"; filename: string } | null {
  const normalized = rewriteBroadcastMediaUrl(url);
  if (!normalized?.startsWith(BROADCAST_MEDIA_API_PREFIX)) return null;
  const rest = normalized.slice(BROADCAST_MEDIA_API_PREFIX.length + 1);
  const parts = rest.split("/");
  if (parts.length !== 3) return null;
  const [collectionId, kind, filename] = parts;
  if (!collectionId || !filename) return null;
  if (kind !== "masters" && kind !== "thumbs") return null;
  return {
    collectionId: decodeURIComponent(collectionId),
    kind,
    filename: decodeURIComponent(filename),
  };
}
