export type BrowserPlusMode = "library" | "retroverse" | "work";

export type BrowserPlusColumnId =
  | "icon"
  | "artist"
  | "title"
  | "genre"
  | "year"
  | "playCount"
  | "label"
  | "grouping"
  | "rvTags"
  | "rvtr"
  | "packageStatus"
  | "deckStatus"
  | "coverStatus"
  | "thumbnailStatus"
  | "thumbnailSource"
  | "workStatus"
  | "album"
  | "bpm"
  | "key"
  | "length"
  | "firstSeen"
  | "lastPlay"
  | "user1"
  | "user2"
  | "filePath"
  | "thumbnailPath"
  | "matchMethod"
  | "coverageScore"
  | "canonicalArtist"
  | "canonicalTrack"
  | "lastGenerated"
  | "lastPublished"
  | "coverageFlags"
  | "poiCount"
  | "linkState";

export type BrowserPlusColumn = {
  id: BrowserPlusColumnId;
  label: string;
  width: number;
  minWidth: number;
  sortable: boolean;
  source: "vdj" | "retroverse" | "derived";
  align?: "left" | "right" | "center";
  modes: BrowserPlusMode[];
};

export type BrowserPlusWorkStatus =
  | "Missing RVTR"
  | "Missing Cover"
  | "Missing Package"
  | "Needs Review"
  | "Cards Ready"
  | "Ready To Publish"
  | "Published"
  | "Complete";

export type BrowserPlusSavedFilterId =
  | "missing-rvtr"
  | "missing-cover"
  | "missing-file"
  | "missing-thumbnail"
  | "thumbnail-present"
  | "thumbnail-only"
  | "thumbnail-cover"
  | "patron-ready"
  | "missing-package"
  | "missing-deck"
  | "needs-review"
  | "cards-ready"
  | "published"
  | "complete"
  | "pk"
  | "dk"
  | "video-only"
  | "high-play-count";

export type BrowserPlusRow = {
  id: string;
  filePath: string;
  fileName: string;
  fileType: string;
  folderPath: string[];
  folderKey: string;
  mediaKind: "audio" | "video" | "netsearch" | "other";
  artist: string;
  title: string;
  album: string;
  genre: string;
  year: number | null;
  bpm: number | null;
  key: string;
  lengthSeconds: number | null;
  playCount: number | null;
  firstSeen: string | null;
  firstPlay: string | null;
  lastPlay: string | null;
  label: string;
  grouping: string;
  user1: string;
  user2: string;
  rvTags: string;
  rvtr: string | null;
  matchMethod: "Label" | "FilePath" | "Artist+Title" | "Alias Match" | "Chart Orbit" | "Manual" | "Unmatched";
  packageStatus: string;
  deckStatus: string;
  coverStatus: string;
  thumbnailStatus: "Present" | "Missing" | "Video Missing";
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  thumbnailSource: "Sidecar JPG" | "Sidecar EXT.JPG" | "Sidecar PNG" | "Missing";
  workStatus: BrowserPlusWorkStatus;
  workStatusReason: string;
  coverageScore: 0 | 1 | 2 | 3 | 4 | 5;
  canonicalArtist: string | null;
  canonicalTrack: string | null;
  lastGenerated: string | null;
  lastPublished: string | null;
  coverageFlags: string[];
  poiCount: number;
  linkCount: number;
  hasVdjCover: boolean;
  hasCover: boolean;
  hasRetroverseCover: boolean;
  retroverseCoverUrl: string | null;
  fileExists: boolean;
  isVideo: boolean;
  searchText: string;
};

export type BrowserPlusFolderNode = {
  id: string;
  name: string;
  path: string[];
  trackCount: number;
  rvtrCount: number;
  dkCount: number;
  pkCount: number;
  missingCovers: number;
  missingPackages: number;
  children: BrowserPlusFolderNode[];
};

export type BrowserPlusStats = {
  /**
   * Metric ownership:
   * - Library Health: VDJ/library shape, file paths, thumbnails, identity labels.
   * - Retroverse Production: package/cover/deck production readiness.
   * - Patron Readiness: visible patron-facing readiness signals.
   * - Diagnostics: parse/UI performance and browser tree shape.
   */
  totalTracks: number;
  videoTracks: number;
  rvtrMapped: number;
  pkCount: number;
  dkCount: number;
  noRvtr: number;
  coversPresent: number;
  vdjCovers: number;
  retroverseCovers: number;
  thumbnailsPresent: number;
  missingThumbnails: number;
  missingFiles: number;
  patronReady: number;
  folderCount: number;
  parseMs: number;
  libraryHealth: {
    missingFile: number;
    missingThumbnail: number;
    repairableThumbnail: number;
    requiresGenerationThumbnail: number;
    vaultMissingThumbnail: number;
    missingRvtr: number;
  };
  retroverseHealth: {
    missingPackage: number;
    packageCandidates: number;
    needsRvtr: number;
    coverFirst: number;
    outOfScope: number;
    needsReview: number;
    missingDeck: number;
  };
  thumbnailFolderHotspots: Array<{
    folder: string;
    videos: number;
    missing: number;
    missingRate: number;
  }>;
};

export type BrowserPlusModel = {
  databasePath: string;
  databaseMtime: string | null;
  databaseSizeBytes: number;
  parsedAt: string;
  virtualDjRunning: boolean;
  readOnly: true;
  rows: BrowserPlusRow[];
  folders: BrowserPlusFolderNode[];
  columns: BrowserPlusColumn[];
  stats: BrowserPlusStats;
};
