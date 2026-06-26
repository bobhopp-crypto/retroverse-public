/**
 * Collector 4.0 — frozen research package contract.
 *
 * Downstream departments (Editor, Director, Publisher, …) consume
 * `CollectorPackage` after normalization. They must not read the filesystem
 * or depend on pipeline stage internals.
 */

export { COLLECTOR_PACKAGE_VERSION } from "@/lib/studio/package";

export type EditorHandoffDomain =
  | "identity"
  | "song"
  | "recording"
  | "performance"
  | "culture"
  | "visual_assets"
  | "relationships";

export type EditorHandoffStatus = "Ready" | "Partial" | "Missing";

export type EditorHandoffItem = {
  id: EditorHandoffDomain;
  label: string;
  status: EditorHandoffStatus;
};

export type EditorHandoffView = {
  title: string;
  items: EditorHandoffItem[];
};

/** Re-export the frozen package contract for downstream departments. */
export type {
  CollectorPackage,
  CollectorPerformance,
  CollectorSongArchive,
  CollectorSongEntity,
  CollectorRecordingEntity,
  CollectorPerformanceEntity,
  CollectorTimelines,
  CollectorYearResolution,
  CollectorCanonicalModel,
  CollectorTimelineEvent,
} from "./types";
