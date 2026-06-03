import { normalizeGraphTrackId } from "./graph-track-id";

export function chartWorkspaceKey(graphTrackId: number | string): string {
  const id = normalizeGraphTrackId(graphTrackId);
  if (id == null) throw new Error("Invalid graphTrackId");
  return `chart-track-${id}`;
}

export function mediaWorkspaceKey(mediaId: number | string): string {
  return `media-${mediaId}`;
}

/** Primary review key for VirtualDJ video-universe rows (always 1:1 with media_assets.id). */
export function videoUniverseWorkspaceKey(mediaId: number | string): string {
  return mediaWorkspaceKey(mediaId);
}
