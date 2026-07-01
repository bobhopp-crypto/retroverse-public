export type LibraryCollectorStatus = "complete" | "partial";
export type LibraryEditorStatus = "none" | "draft" | "submitted";
export type LibraryPublisherStatus = "none" | "evaluated" | "published";

export type SongHealthTone = "ok" | "warn" | "dim" | "info";

export type SongHealth = {
  label: string;
  tone: SongHealthTone;
  score: number;
};

export type ProductionLibrarySong = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  coverUrl: string | null;
  playCount: number;
  lastPlay: string | null;
  firstSeen: string | null;
  collectorStatus: LibraryCollectorStatus;
  editorStatus: LibraryEditorStatus;
  publisherStatus: LibraryPublisherStatus;
  hasChartJourney: boolean;
  hasStory: boolean;
  hasExperience: boolean;
  hasVideo: boolean;
  lastUpdated: string | null;
  albumTitle: string | null;
  health: SongHealth;
  links: {
    song: string;
    editor: string;
    collector: string;
    artist: string;
    album: string | null;
    chartJourney: string;
    experience: string | null;
    vdjMatch: string;
  };
};

export type ProductionLibraryCounts = {
  total: number;
  needsWork: number;
  ready: number;
  published: number;
  missingCover: number;
  missingStory: number;
  missingCharts: number;
  missingExperience: number;
  collectorComplete: number;
  hasVideo: number;
  noVideo: number;
  playCount0: number;
  playCount1: number;
  playCount2to5: number;
  playCount6to25: number;
  playCount25Plus: number;
};

export type ProductionLibraryData = {
  generatedAt: string;
  songs: ProductionLibrarySong[];
  counts: ProductionLibraryCounts;
  years: number[];
};

export type LibraryFilterId =
  | "needs_work"
  | "ready"
  | "published"
  | "missing_cover"
  | "missing_story"
  | "missing_charts"
  | "missing_experience"
  | "collector_complete"
  | "has_video"
  | "no_video"
  | "play_0"
  | "play_1"
  | "play_2_5"
  | "play_6_25"
  | "play_25_plus";

export type LibrarySortId =
  | "play_high"
  | "play_low"
  | "recently_played"
  | "recently_added"
  | "year"
  | "artist"
  | "title"
  | "recently_updated";
