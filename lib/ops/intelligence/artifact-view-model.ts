import type { PackageIntel, SongPackage } from "./song-package-types";
import type { DisplayStory } from "./package-view-model";
import { buildPackageIntel } from "./package-intel";
import { buildPackageViewModel, defaultRelationships } from "./package-view-model";

export type SongDnaMetrics = {
  sources: number;
  stories: number;
  recording: number;
  video: number;
  chartPeak: number | null;
  quotes: number;
  confidence: number;
};

export type ArtifactStudioModel = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  albumTitle: string | null;
  coverUrl: string | null;
  intel: PackageIntel;
  stories: DisplayStory[];
  metrics: SongDnaMetrics;
};

function computeMetrics(pkg: SongPackage, intel: PackageIntel, stories: DisplayStory[]): SongDnaMetrics {
  const cards = pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden);
  const recording =
    intel.recordingFacts.length ||
    cards.filter((c) => c.category === "recording").length;
  const video =
    intel.videoFacts.length ||
    cards.filter((c) => c.category === "video" || c.category === "performance").length;
  const quotes =
    cards.filter((c) => c.category === "quote").length +
    pkg.candidateFacts.filter((f) => f.category === "quote").length;

  const confidences = [
    ...pkg.researchVault.map((s) => s.confidence),
    ...cards.map((c) => c.confidence),
  ];
  const confidence =
    confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
      : 0;

  return {
    sources: pkg.researchVault.length,
    stories: stories.length,
    recording,
    video,
    chartPeak: pkg.metadata.peakHot100,
    quotes,
    confidence,
  };
}

export function buildArtifactStudioModel(pkg: SongPackage): ArtifactStudioModel {
  const intel = buildPackageIntel(pkg);
  const view = buildPackageViewModel({ ...pkg, intel }, defaultRelationships(pkg));
  const stories = view.stories;

  return {
    rvtr: pkg.rvtr,
    title: pkg.metadata.title,
    artist: pkg.metadata.artist,
    year: pkg.metadata.year,
    albumTitle: pkg.metadata.albumTitle,
    coverUrl: pkg.metadata.coverUrl,
    intel,
    stories,
    metrics: computeMetrics(pkg, intel, stories),
  };
}
