export type HeroRequestStatus = "draft" | "pending_renderer" | "assigned" | "failed";

export type HeroImageSpecs = {
  width: 1080;
  height: 1920;
  aspectRatio: "9:16";
  portrait: true;
};

export const HERO_IMAGE_SPECS: HeroImageSpecs = {
  width: 1080,
  height: 1920,
  aspectRatio: "9:16",
  portrait: true,
};

export type HeroRequest = {
  version: 1;
  rvtr: string;
  songTitle: string;
  artist: string;
  prompt: string;
  outputPath: string;
  outputUrl: string | null;
  createdAt: string;
  updatedAt: string;
  status: HeroRequestStatus;
  specs: HeroImageSpecs;
};

export type HeroPromptInput = {
  title: string;
  artist: string;
  year: number | null;
  albumTitle: string | null;
  genre: string | null;
  mood: string[];
  stories: string[];
  objects: string[];
  locations: string[];
  historicalContext: string[];
};
