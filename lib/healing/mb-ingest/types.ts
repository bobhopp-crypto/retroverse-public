export const MB_CANARY_BATCH = "MB-CANARY-25";
export const MB_WAVE_25_BATCH = "MB-WAVE-25";
export const MB_WAVE_50_BATCH = "MB-WAVE-50";
export const MB_WAVE_100_BATCH = "MB-WAVE-100";
export const WAVE_25_TARGET = 25;
export const WAVE_50_TARGET = 50;
export const WAVE_100_TARGET = 100;

export type MbIngestProposalStatus =
  | "staged"
  | "approved"
  | "applied"
  | "rolled_back"
  | "rejected";

export type MbTracklistSlot = {
  position: number | null;
  title: string;
};

export type PilotMbRow = {
  rvtr: string;
  title: string;
  artist_name: string;
  chart_year: number | null;
  chart_weeks: number;
  artist_id: number | null;
  mb: {
    mbRecordingId: string | null;
    mbReleaseId: string | null;
    artist: string | null;
    album: string | null;
    releaseYear: number | null;
    trackPosition: number | null;
    trackTitleOnAlbum: string | null;
    tracklist: MbTracklistSlot[];
    complete: boolean;
    note: string;
  };
  autoIngestable: boolean;
  confidence: string;
  signals: string[];
};

export type MbIngestSafetyResult =
  | { ok: true; qualifyReason: string; signals: string[] }
  | { ok: false; reason: string };

export type MbIngestProposalRow = {
  proposal_id: number;
  batch_name: string;
  rvtr: string;
  artist_id: number;
  artist_name: string;
  track_title: string;
  mb_release_group_id: string | null;
  mb_release_id: string;
  mb_recording_id: string | null;
  proposed_rval: string;
  proposed_album_title: string;
  proposed_album_year: number | null;
  proposed_track_position: number;
  proposed_tracklist_json: MbTracklistSlot[];
  confidence: string;
  signals_json: string[];
  qualify_reason: string | null;
  status: MbIngestProposalStatus;
  created_at: string;
  updated_at: string;
};

export type MbCurationVerdict = "approve" | "review" | "reject";

export type MbTrackRecovery = {
  rvtr: string;
  track_title: string;
  position: number;
  mb_release_id: string;
  mb_recording_id: string | null;
  chart_weeks: number;
  is_primary: boolean;
};

export type MbCanaryStageResult = {
  batchName: string;
  staged: number;
  skipped: number;
  skipReasons: Record<string, number>;
  proposalIds: number[];
  approve: number;
  review: number;
  reject: number;
  albumGroups: number;
};
