import { buildArtifactStudioModel } from "./artifact-view-model";
import { buildPackageViewModel, defaultRelationships } from "./package-view-model";
import type { SongPackage } from "./song-package-types";

export type ArtifactReadiness = {
  record_label: boolean;
  timeline: boolean;
  story_constellation: boolean;
  song_dna: boolean;
  allReady: boolean;
};

export function computeArtifactReadiness(pkg: SongPackage): ArtifactReadiness {
  const view = buildPackageViewModel(pkg, defaultRelationships(pkg));
  const model = buildArtifactStudioModel(pkg);
  const intel = model.intel;
  const storyCount = view.stats.stories;

  const record_label = Boolean(intel.label || intel.catalogNumber);
  const timeline = intel.timelineEvents.length >= 2;
  const story_constellation = storyCount >= 2;
  const song_dna =
    intel.recordingFacts.length + intel.videoFacts.length + intel.chartHistory.length >= 2;

  return {
    record_label,
    timeline,
    story_constellation,
    song_dna,
    allReady: record_label && timeline && story_constellation && song_dna,
  };
}

export function packageConfidence(pkg: SongPackage): number {
  return buildPackageViewModel(pkg, defaultRelationships(pkg)).health.confidence;
}
