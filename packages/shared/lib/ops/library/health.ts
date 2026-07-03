import type { ProductionLibrarySong, SongHealth } from "./types";

function isReadySong(song: ProductionLibrarySong): boolean {
  return (
    song.health.score >= 90 &&
    song.collectorStatus === "complete" &&
    song.publisherStatus === "published" &&
    Boolean(song.coverUrl) &&
    song.hasStory &&
    song.hasChartJourney &&
    song.hasExperience
  );
}

export function computeSongHealth(input: {
  collectorStatus: ProductionLibrarySong["collectorStatus"];
  editorStatus: ProductionLibrarySong["editorStatus"];
  publisherStatus: ProductionLibrarySong["publisherStatus"];
  coverUrl: string | null;
  hasChartJourney: boolean;
  hasStory: boolean;
  hasExperience: boolean;
  hasVideo: boolean;
}): SongHealth {
  const checks = [
    input.collectorStatus === "complete",
    input.editorStatus === "submitted",
    input.publisherStatus === "published",
    Boolean(input.coverUrl),
    input.hasChartJourney,
    input.hasStory,
    input.hasExperience,
    input.hasVideo,
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  if (
    score >= 90 &&
    input.publisherStatus === "published" &&
    input.coverUrl &&
    input.hasStory &&
    input.hasChartJourney &&
    input.hasExperience
  ) {
    return { label: "READY", tone: "ok", score };
  }
  if (!input.coverUrl) return { label: "Missing Cover", tone: "warn", score };
  if (!input.hasStory) return { label: "Needs Story", tone: "warn", score };
  if (!input.hasChartJourney) return { label: "Missing Charts", tone: "warn", score };
  if (!input.hasExperience) return { label: "Missing Experience", tone: "warn", score };
  if (score >= 90) return { label: "READY", tone: "ok", score };
  return { label: `${score}%`, tone: score >= 60 ? "info" : "dim", score };
}

export function songNeedsWork(song: ProductionLibrarySong): boolean {
  return !isReadySong(song);
}

export function songIsReady(song: ProductionLibrarySong): boolean {
  return isReadySong(song);
}
