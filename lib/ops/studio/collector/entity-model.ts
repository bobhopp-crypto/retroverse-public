/**
 * Collector Sprint A3 — Song / Recording / Performance entity model.
 * Client-safe type definitions.
 */

import type { CollectorResearchFact } from "./types";

export type CollectorFactScope = "song" | "recording" | "performance";

export type CollectorTimelineDomain = "song" | "recording" | "performance";

export type CollectorTimelineEventKind =
  | "writing"
  | "recording"
  | "release"
  | "chart"
  | "award"
  | "legacy"
  | "session"
  | "album"
  | "compilation"
  | "remaster"
  | "reissue"
  | "concert"
  | "television"
  | "music_video"
  | "festival"
  | "tour"
  | "award_show"
  | "other";

export type CollectorTimelineEvent = {
  id: string;
  domain: CollectorTimelineDomain;
  kind: CollectorTimelineEventKind;
  year: number | null;
  label: string;
  detail: string | null;
  confidence: number;
  source: string;
  /** Links to recording id or performance id when scoped. */
  entityRef: string | null;
};

export type CollectorTimelines = {
  song: CollectorTimelineEvent[];
  recording: CollectorTimelineEvent[];
  performance: CollectorTimelineEvent[];
};

export type CollectorYearAnchor = {
  year: number | null;
  label: string;
  confidence: number;
  source: string;
};

export type CollectorYearResolution = {
  songRelease: CollectorYearAnchor;
  recordingRelease: CollectorYearAnchor;
  primaryPerformance: CollectorYearAnchor | null;
  conflicts: string[];
  notes: string[];
};

export type CollectorRecordingKind =
  | "original_studio"
  | "studio_album"
  | "compilation"
  | "remaster"
  | "reissue"
  | "live_album"
  | "unknown";

/** Composition — identity that does not change with which video plays. */
export type CollectorSongEntity = {
  rvtr: string;
  artist: string;
  title: string;
  writers: string[];
  originalReleaseYear: number | null;
  originalAlbum: string | null;
  peakHot100: number | null;
  chartWeeks: number | null;
  certifications: string[];
  culturalSignificance: string[];
  relatedArtists: string[];
  legacy: string[];
  confidence: number;
};

/** One specific recording edition (studio take, album, compilation, remaster). */
export type CollectorRecordingEntity = {
  id: string;
  kind: CollectorRecordingKind;
  title: string;
  recordingDate: number | null;
  recordingLocation: string | null;
  producer: string | null;
  engineer: string | null;
  musicians: string[];
  albumTitle: string | null;
  isCompilation: boolean;
  isRemaster: boolean;
  label: string | null;
  releaseDate: number | null;
  catalogNumber: string | null;
  notes: string[];
  confidence: number;
  source: string;
};

export type CollectorPerformanceKind =
  | "live"
  | "television"
  | "music_video"
  | "festival"
  | "award_show"
  | "concert"
  | "unknown";

/** One owned performance video — scoped to footage, not the composition. */
export type CollectorPerformanceEntity = {
  id: string;
  title: string;
  kind: CollectorPerformanceKind;
  virtualDjFilePath: string | null;
  sourceVideo: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  performanceYear: number | null;
  event: string | null;
  tvShow: string | null;
  tour: string | null;
  durationSec: number | null;
  qualityScore: number;
  performanceNotes: string;
  facts: string[];
  confidence: number;
};

export type CollectorCanonicalModel = {
  song: CollectorSongEntity;
  recordings: CollectorRecordingEntity[];
  performances: CollectorPerformanceEntity[];
  timelines: CollectorTimelines;
  yearResolution: CollectorYearResolution;
};

export type ScopedResearchFact = CollectorResearchFact & {
  scope?: CollectorFactScope;
  scopeRef?: string | null;
};
