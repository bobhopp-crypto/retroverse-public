import "server-only";
import { createHash } from "node:crypto";
import { songResearchSelectionToken } from "../../../../packages/shared/lib/home/song-research-selection";
import type { VerifiedSong } from "./openai-adapter";

// Loader must obtain this envelope from authoritative server-side selection and
// recording-resolution data, never HTTP input. No loader implementation/file reads
// are provided here. Unknown recording mappings must return null, not title hashes.
export type TrustedSnapshot = {
  state: unknown;
  recording: { authoritative: true; identity: string; title: string; artist: string; startedAt: string; ambiguous: false };
};
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const field = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 200 && !/[\u0000-\u001f\u007f]/.test(v);
export function mapTrustedSnapshot(snapshot: TrustedSnapshot | null, now: number): VerifiedSong | null {
  if (!snapshot || !Number.isFinite(now)) return null;
  const state = record(snapshot.state), live = record(state.live), recording = record(snapshot.recording);
  if (state.bridgePlaying !== true || live.source !== "bridge" || recording.authoritative !== true || recording.ambiguous !== false) return null;
  if (!songResearchSelectionToken(live) || !field(live.title) || !field(live.artist) || !field(recording.identity) || !field(live.startedAt) || recording.startedAt !== live.startedAt || recording.title !== live.title || recording.artist !== live.artist) return null;
  // Match existing live-freshness.ts: unchanged bridge publication can be sparse.
  // Validate the bridge using its 25-minute window and two-minute clock allowance;
  // verifiedAtMs below is validation time, not last publication time.
  const parsedTick = typeof live.bridgeTimestamp === "string" ? Date.parse(live.bridgeTimestamp) : NaN;
  const tick = Number.isFinite(parsedTick) ? parsedTick : typeof state.updatedAt === "string" ? Date.parse(state.updatedAt) : NaN;
  const start = Date.parse(live.startedAt);
  if (!Number.isFinite(tick) || !Number.isFinite(start) || now - tick < -120000 || now - tick > 25 * 60000 || start > tick) return null;
  const year = live.vdjYear ?? live.year;
  if (year != null && (typeof year !== "number" || !Number.isInteger(year) || year < 1800 || year > 2100)) return null;
  return { verified: true, playing: true, title: live.title, artist: live.artist, startedAt: live.startedAt, rvtr: (live.rvtr as string).toUpperCase(),
    ...(year == null ? {} : { year: year as number }), recordingIdentity: recording.identity,
    selectionVersion: createHash("sha256").update(JSON.stringify([recording.identity, live.startedAt])).digest("hex"),
    verifiedAtMs: now, ambiguous: false };
}
export function createTrustedStateReader(loadSnapshot: (signal: AbortSignal) => Promise<TrustedSnapshot | null>, now = Date.now) {
  return async (signal: AbortSignal): Promise<VerifiedSong | null> => {
    if (signal.aborted) return null;
    try { const snapshot = await loadSnapshot(signal); return signal.aborted ? null : mapTrustedSnapshot(snapshot, now()); }
    catch { return null; }
  };
}
