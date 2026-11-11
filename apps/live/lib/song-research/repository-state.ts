import "server-only";
import { createHash } from "node:crypto";
import { createTrustedStateReader, type TrustedSnapshot } from "./trusted-state";

/** Uses already resolved bridge media identity, never a title-only catalog guess.
 * No media file is opened. Unresolved/fallback selections fail closed.
 */
export function createRepositoryStateReader(loadState: () => Promise<unknown>, now = Date.now) {
  return createTrustedStateReader(async signal => {
    if (signal.aborted) return null;
    const value = await loadState();
    if (signal.aborted || !value || typeof value !== "object" || Array.isArray(value)) return null;
    const state = value as Record<string, any>, live = state.live;
    if (!live || !["filepath", "vdj-library"].includes(live.resolution) || typeof live.filepath !== "string" || !live.filepath.trim() || live.filepath.length > 4096 || /[\u0000-\u001f]/.test(live.filepath) || typeof live.rvtr !== "string" || !/^RVTR\d{6}$/.test(live.rvtr)) return null;
    const identity = createHash("sha256").update(JSON.stringify(["resolved-bridge-media-v1", live.rvtr, live.filepath])).digest("hex");
    return { state, recording: { authoritative: true, identity, title: live.title, artist: live.artist, startedAt: live.startedAt, ambiguous: false } } as TrustedSnapshot;
  }, now);
}

// Dynamic import delays even initialization of the real state store until invoked.
// Repository storage lacks AbortSignal support; the outer adapter deadline bounds
// waiting and all late results are discarded. No automatic read retries are added.
export const readRepositoryCurrentSong = createRepositoryStateReader(async () => {
  const { loadSundayNightsState } = await import("../../../../packages/shared/lib/sunday-nights/state");
  return loadSundayNightsState();
});
