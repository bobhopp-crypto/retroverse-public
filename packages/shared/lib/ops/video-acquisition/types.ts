export type AcquisitionState =
  | "idle"
  | "checking-local"
  | "already-owned"
  | "needs-video"
  | "searching"
  | "candidates-ready"
  | "approved"
  | "downloading"
  | "validating"
  | "moving"
  | "writing-vdj-label"
  | "complete"
  | "failed"
  | "skipped";

export type CandidateType =
  | "official_music_video"
  | "official_live_performance"
  | "television_performance"
  | "concert_footage"
  | "lyric_video"
  | "visualizer"
  | "fan_upload"
  | "audio_only_upload"
  | "unknown";

export type LocalOwnershipMatchMethod =
  | "rvtr_vdj_label"
  | "vdj_filepath"
  | "media_link"
  | "sidecar_manifest"
  | "artist_title_vdj";

export type VideoCandidate = {
  videoId: string;
  title: string;
  webpageUrl: string;
  thumbnailUrl: string;
  channel: string;
  durationSeconds: number | null;
  uploadDate: string | null;
  viewCount: number | null;
  availability: string | null;
  liveStatus: string | null;
  candidateType: CandidateType;
};

export type LocalOwnershipResult = {
  owned: boolean;
  filepath: string | null;
  matchMethod: LocalOwnershipMatchMethod | null;
  fileSizeBytes: number | null;
  durationSeconds: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number | null;
  height: number | null;
  vdjFilePath: string | null;
};

export type VideoProbeResult = {
  valid: boolean;
  filepath: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number | null;
  height: number | null;
  container: string | null;
  reason?: string;
};

export type DuplicateConflictKind =
  | "youtube_id_recorded"
  | "destination_exists"
  | "rvtr_already_owned"
  | "staging_partial";

export type DuplicateConflict = {
  kind: DuplicateConflictKind;
  message: string;
  detail?: string;
};

export type ApprovedCandidateRecord = {
  videoId: string;
  title: string;
  webpageUrl: string;
  channel: string;
  durationSeconds: number | null;
  candidateType: CandidateType;
  approvedAt: string;
};

export type GenreSource = "vdj_audio" | "none";

export type AcquisitionManifest = {
  version: 1;
  rvtr: string;
  state: AcquisitionState;
  artist: string;
  title: string;
  year: number | null;
  genre: string | null;
  genreSource: GenreSource;
  searchQuery: string | null;
  vdjFilePath: string | null;
  selectedCandidate: VideoCandidate | null;
  approvedCandidate: ApprovedCandidateRecord | null;
  candidates: VideoCandidate[];
  stagingDir: string;
  destinationPath: string | null;
  finalPath: string | null;
  sourceUrl: string | null;
  youtubeId: string | null;
  downloadedFormat: string | null;
  validation: VideoProbeResult | null;
  vdjLabelStatus: "written" | "not_in_database" | "skipped" | "failed" | null;
  vdjLabelMessage: string | null;
  vdjBackupPath: string | null;
  failureStage: string | null;
  failureMessage: string | null;
  updatedAt: string;
};

export type AcquisitionCompletion = {
  state: "complete";
  finalPath: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  sourceUrl: string;
  youtubeId: string;
  rvtr: string;
  vdjLabelStatus: NonNullable<AcquisitionManifest["vdjLabelStatus"]>;
  vdjLabelMessage: string;
  vdjBackupPath: string | null;
  manualRescanRequired: boolean;
  manifestPath: string;
};

export type AcquisitionFailure = {
  state: "failed";
  stage: string;
  message: string;
  recoverableAction: string;
};

export type ConfidenceDecision = "auto" | "review" | "reject";

export type ConfidenceGateResult = {
  decision: ConfidenceDecision;
  reasons: string[];
  candidate: VideoCandidate | null;
  alternateCount: number;
};

export type BatchAcquireStatus = "queued" | "running" | "complete" | "failed";

export type BatchDownloadStatus =
  | "pending"
  | "searching"
  | "approved"
  | "downloading"
  | "complete"
  | "failed"
  | "skipped"
  | "awaiting_rescan"
  | "needs_review";

export type BatchReviewStatus = "none" | "pending" | "kept" | "rejected" | "choose_another";

export type BatchAcquireItem = {
  targetRowKey: string;
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  genre: string | null;
  genreSource: GenreSource;
  chartRank: number;
  searchCandidates: VideoCandidate[];
  candidateId: string | null;
  candidateUrl: string | null;
  candidateTitle: string | null;
  candidateChannel: string | null;
  candidateThumbnailUrl: string | null;
  durationSeconds: number | null;
  confidence: ConfidenceDecision | null;
  confidenceReasons: string[];
  downloadStatus: BatchDownloadStatus;
  reviewStatus: BatchReviewStatus;
  finalFilePath: string | null;
  perRvtrManifestPath: string | null;
  errorMessage: string | null;
  vdjLabelStatus: AcquisitionManifest["vdjLabelStatus"];
  vdjLabelMessage: string | null;
};

export type BatchAcquireSummary = {
  queued: number;
  searching: number;
  downloaded: number;
  needsReview: number;
  failed: number;
  complete: number;
  awaitingRescan: number;
};

export type BatchAcquireManifest = {
  version: 1;
  batchId: string;
  scanId: string;
  filter: string;
  limit: number;
  status: BatchAcquireStatus;
  createdAt: string;
  updatedAt: string;
  summary: BatchAcquireSummary;
  items: BatchAcquireItem[];
};
