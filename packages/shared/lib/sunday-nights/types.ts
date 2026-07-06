export type LiveResolution = "filepath" | "vdj-library" | "fallback" | "unresolved";

export type LiveSource = "manual" | "bridge" | "channel";

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
  /** False when VirtualDJ playback stops. */
  playing: boolean;
  timestamp: string;
  filepath?: string;
  artist?: string;
  title?: string;
  deck?: number;
};

export type SundayNightsState = {
  version: 2;
  currentTrackId: string | null;
  live: SundayNightsLiveSelection | null;
  updatedAt: string;
  /** OSC bridge — deck is audible / playback active. */
  bridgePlaying?: boolean;
  /** When bridge last reported playback stopped. */
  bridgeStoppedAt?: string | null;
  /** Broadcast rotation paused for VirtualDJ live mode. */
  vdjTakeoverActive?: boolean;
  /** Idle timeout anchor for resuming broadcast. */
  vdjStoppedAt?: string | null;
};

export type SundayEventMode = {
  enabled: boolean;
  updatedAt: string;
};

export type { CollectorPassRegistration as PassRegistration } from "@/lib/collector-pass/types";
