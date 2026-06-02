import { normalizeGraphTrackId } from "./graph-track-id";

export function chartWorkspaceKey(graphTrackId: number | string): string {
  const id = normalizeGraphTrackId(graphTrackId);
  if (id == null) throw new Error("Invalid graphTrackId");
  return `chart-track-${id}`;
}

export function mediaWorkspaceKey(mediaId: number): string {
  return `media-${mediaId}`;
}
