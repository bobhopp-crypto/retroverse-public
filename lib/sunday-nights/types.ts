export type LiveResolution = "filepath" | "fallback" | "unresolved";

export type LiveSource = "manual" | "bridge";

export type SundayNightsLiveSelection = {
  rvtr: string | null;
  artist: string;
  title: string;
  year: number | null;
  coverUrl?: string | null;
  songKey?: string | null;
  /** Who published this selection. */
  source?: LiveSource | null;
  /** VDJ bridge metadata (optional). */
  filepath?: string | null;
  deck?: number | null;
  bridgeTimestamp?: string | null;
  resolution?: LiveResolution | null;
};

export type BridgeLivePostBody = {
  filepath: string;
  artist: string;
  title: string;
  deck: number;
  timestamp: string;
};

export type SundayNightsState = {
  version: 2;
  currentTrackId: string | null;
  live: SundayNightsLiveSelection | null;
  updatedAt: string;
};

export type SundayEventMode = {
  enabled: boolean;
  updatedAt: string;
};

export type { CollectorPassRegistration as PassRegistration } from "@/lib/collector-pass/registrations";
