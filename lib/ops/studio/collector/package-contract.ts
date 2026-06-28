/**
 * Collector 4.0 — frozen research package contract.
 *
 * Downstream departments (Editor, Director, Publisher, …) consume
 * `CollectorPackage` after normalization. They must not read the filesystem
 * or depend on pipeline stage internals.
 */

export { COLLECTOR_PACKAGE_VERSION } from "@/lib/studio/package";

export type {
  CollectorEditorHandoffDomain,
  CollectorEditorHandoffStatus,
  CollectorEditorHandoffItem,
  CollectorEditorHandoffView,
  EditorHandoffDomain,
  EditorHandoffStatus,
  EditorHandoffItem,
  EditorHandoffView,
} from "@/lib/studio/contract";

/** Re-export the frozen package contract for downstream departments. */
export type {
  CollectorPackage,
  CollectorPerformance,
  CollectorSongArchive,
  CollectorLyricsArtifact,
  CollectorSongEntity,
  CollectorRecordingEntity,
  CollectorPerformanceEntity,
  CollectorTimelines,
  CollectorYearResolution,
  CollectorCanonicalModel,
  CollectorTimelineEvent,
} from "./types";

export type {
  CollectorVisualIdentityPackage,
  PerformanceVisualIdentity,
  VisualIdentityProfile,
  VisualLightingStyle,
} from "./visual-identity-types";

export type {
  CollectorSongDna,
  SongDnaExperience,
  SongDnaMusical,
  SongDnaStory,
  SongDnaVisual,
} from "./song-dna-types";
