export type OpsQueueMissingVideoRow = {
  id: string;
  artist: string;
  title: string;
  year?: number | null;
  localPath: string;
  r2Status: "missing" | "stale" | "size_mismatch" | "ok";
  localBytes: number;
  r2Bytes?: number | null;
  modifiedAt: string;
};

export type OpsQueueMissingArtworkRow = {
  id: string;
  album: string;
  artist: string;
  year?: number | null;
  coverStatus: "missing" | "placeholder" | "low_res" | "ok";
  chartRelevance: "high" | "medium" | "low";
  curatorHref: string;
};

export type OpsQueueMetadataIssueRow = {
  id: string;
  issueType:
    | "duplicate_artist"
    | "missing_year"
    | "blank_genre"
    | "malformed_title"
    | "missing_song_id"
    | "fuzzy_mismatch"
    | "suspicious_data";
  entity: string;
  details: string;
  confidence: "high" | "medium" | "low";
};

export type OpsActivityRow = {
  id: string;
  ts: string;
  entity: string;
  action: string;
  source: string;
  status: "ok" | "warn" | "error";
};

export function mockMissingVideoUploads(): OpsQueueMissingVideoRow[] {
  return [
    {
      id: "vid-001",
      artist: "Prince",
      title: "1999 (Live)",
      year: 1982,
      localPath: "/Volumes/RETROVERSE/Video/Prince/1999 (Live).mp4",
      r2Status: "missing",
      localBytes: 182_331_122,
      r2Bytes: null,
      modifiedAt: "2026-05-23 21:14",
    },
    {
      id: "vid-002",
      artist: "Madonna",
      title: "Like a Prayer",
      year: 1989,
      localPath: "/Volumes/RETROVERSE/Video/Madonna/Like a Prayer.mp4",
      r2Status: "size_mismatch",
      localBytes: 244_112_009,
      r2Bytes: 241_010_221,
      modifiedAt: "2026-05-20 09:02",
    },
    {
      id: "vid-003",
      artist: "Fleetwood Mac",
      title: "Dreams",
      year: 1977,
      localPath: "/Volumes/RETROVERSE/Video/Fleetwood Mac/Dreams.mp4",
      r2Status: "stale",
      localBytes: 198_555_430,
      r2Bytes: 198_555_430,
      modifiedAt: "2026-05-24 00:41",
    },
  ];
}

export function mockMissingArtwork(): OpsQueueMissingArtworkRow[] {
  return [
    {
      id: "art-001",
      album: "Rumours",
      artist: "Fleetwood Mac",
      year: 1977,
      coverStatus: "placeholder",
      chartRelevance: "high",
      curatorHref: "/control-center",
    },
    {
      id: "art-002",
      album: "Purple Rain",
      artist: "Prince",
      year: 1984,
      coverStatus: "missing",
      chartRelevance: "high",
      curatorHref: "/control-center",
    },
    {
      id: "art-003",
      album: "Parallel Lines",
      artist: "Blondie",
      year: 1978,
      coverStatus: "low_res",
      chartRelevance: "medium",
      curatorHref: "/control-center",
    },
  ];
}

export function mockMetadataIssues(): OpsQueueMetadataIssueRow[] {
  return [
    {
      id: "meta-001",
      issueType: "duplicate_artist",
      entity: "RVAR001234 · 'The Weeknd' vs 'Weeknd'",
      details: "Two artist rows likely refer to same canonical entity.",
      confidence: "high",
    },
    {
      id: "meta-002",
      issueType: "missing_year",
      entity: "RVTR009991 · 'Billie Jean'",
      details: "Year is null on canonical display row.",
      confidence: "medium",
    },
    {
      id: "meta-003",
      issueType: "malformed_title",
      entity: "RVTR004201 · 'Take On Me  (Remastered)'",
      details: "Double spaces + parentheses formatting inconsistent.",
      confidence: "low",
    },
    {
      id: "meta-004",
      issueType: "missing_song_id",
      entity: "Track instance · '/Volumes/RETROVERSE/…/song.mp4'",
      details: "VDJ instance not bridged to canonical song_id.",
      confidence: "medium",
    },
  ];
}

export function mockRecentlyUpdated(): OpsActivityRow[] {
  return [
    {
      id: "act-001",
      ts: "2026-05-25 19:18",
      entity: "RVAL002201 · Purple Rain",
      action: "artwork.updated",
      source: "curator",
      status: "ok",
    },
    {
      id: "act-002",
      ts: "2026-05-25 18:44",
      entity: "R2 · retroverse/videos/…/Like a Prayer.mp4",
      action: "upload.detected",
      source: "inventory-scan",
      status: "warn",
    },
    {
      id: "act-003",
      ts: "2026-05-25 17:02",
      entity: "event: disco-1979",
      action: "event.ingest.run",
      source: "ops",
      status: "ok",
    },
    {
      id: "act-004",
      ts: "2026-05-25 16:11",
      entity: "RVTR009991 · Billie Jean",
      action: "metadata.patch",
      source: "manual",
      status: "error",
    },
  ];
}

