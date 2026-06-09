export type PlaybackSource = "youtube" | "media_asset" | "search";

export type PlaybackTarget = {
  source: PlaybackSource;
  url: string;
  youtubeId?: string | null;
  mediaAssetId?: number | null;
};

export type PlaybackResolveResult = {
  rvtr: string;
  title: string;
  artist: string;
  target: PlaybackTarget | null;
  hasVdjMedia: boolean;
};
