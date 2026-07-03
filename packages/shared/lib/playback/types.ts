/** Client-safe playback manifest — no provider names exposed in UI copy. */

export type PlaybackProvider =
  | "vdj_local"
  | "mp4"
  | "youtube"
  | "vimeo"
  | "archive";

export type PlaybackTarget = {
  provider: PlaybackProvider;
  /** HTML5 `<video src>` — local VDJ or hosted MP4. */
  streamUrl?: string | null;
  /** iframe embed — YouTube, Vimeo, Archive. */
  embedUrl?: string | null;
  youtubeId?: string | null;
  mediaAssetId?: number | null;
  /** @deprecated use provider */
  source?: never;
  url?: never;
};

export type PlaybackResolveResult = {
  rvtr: string;
  title: string;
  artist: string;
  target: PlaybackTarget | null;
  hasVdjMedia: boolean;
  canPlay: boolean;
  playLabel: "Play" | "Watch Performance";
};

export type PlaybackManifest = {
  canPlay: boolean;
  playLabel: "Play" | "Watch Performance";
  provider: PlaybackProvider | null;
  streamUrl: string | null;
  embedUrl: string | null;
  youtubeId: string | null;
};

export function toPlaybackManifest(result: PlaybackResolveResult | null): PlaybackManifest {
  if (!result?.canPlay || !result.target) {
    return {
      canPlay: false,
      playLabel: "Play",
      provider: null,
      streamUrl: null,
      embedUrl: null,
      youtubeId: null,
    };
  }

  const { target, playLabel } = result;
  return {
    canPlay: true,
    playLabel,
    provider: target.provider,
    streamUrl: target.streamUrl ?? null,
    embedUrl: target.embedUrl ?? null,
    youtubeId: target.youtubeId ?? null,
  };
}
