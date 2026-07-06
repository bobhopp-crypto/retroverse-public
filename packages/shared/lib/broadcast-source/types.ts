/**
 * Broadcast Source — extensible content supply for the Broadcast rotation.
 *
 * Sprint 1 source: "database-xml" (VirtualDJ library).
 * Future sources (NOT implemented): folder, playlist, collection, year, artist, random.
 */

/** All known source IDs. Add new IDs here when new sources are implemented. */
export type BroadcastSourceId = "database-xml";

export type BroadcastSourceConfig = {
  /** Which source supplies the broadcast queue. */
  id: BroadcastSourceId;
  /** Seconds each song item stays on screen. */
  songDurationSeconds: number;
};

export const BROADCAST_SOURCE_LABELS: Record<BroadcastSourceId, string> = {
  "database-xml": "VirtualDJ Library (database.xml)",
};

export const DEFAULT_BROADCAST_SOURCE: BroadcastSourceConfig = {
  id: "database-xml",
  songDurationSeconds: 45,
};

/** Metadata stamped onto the presentation state after a source refresh. */
export type BroadcastSourceMeta = {
  id: BroadcastSourceId;
  songDurationSeconds: number;
  itemCount: number;
  generatedAt: string;
};
