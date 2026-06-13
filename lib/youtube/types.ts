export type YoutubeEnrichmentStatus = "stub" | "partial" | "full";

export type YoutubeLinkConfidence = "exact" | "high" | "medium" | "low" | "none";

export type TrackWatchVideo = {
  youtubeId: string;
  url: string;
  title: string;
  thumbnailUrl: string | null;
  linkType: string;
  confidence: YoutubeLinkConfidence;
};
