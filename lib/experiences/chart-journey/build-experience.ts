import "server-only";

import { buildChartJourney } from "@/lib/chart-journey/build-chart-journey";
import { detectChartArchetype } from "@/lib/chart-journey/chart-archetype";
import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { normalizeRvtr } from "@/lib/studio/status";

import { CHART_JOURNEY_VISUAL_LANGUAGE, buildChartJourneyChapters } from "./build-chapters";
import { attachChapterWeekAnchors } from "./build-chapter-anchors";
import { buildTimelineWeeks } from "./build-timeline-weeks";
import { reviewChartJourneyExperience } from "./creative-review";
import type { ChartJourneyExperience, ChartJourneyWorkspacePayload } from "./types";

export async function buildChartJourneyExperience(
  rvtrInput: string,
): Promise<ChartJourneyExperience | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  const [track, collector] = await Promise.all([loadTrackPage(rvtr), loadCollectorPackage(rvtr)]);
  if (!track || track.trajectoryWeeks.length === 0) return null;

  const model = buildChartJourney({
    weeks: track.trajectoryWeeks,
    peak: track.peakHot100,
    chartLabel: track.chartRunLabel,
    focusTrackId: track.rvtr,
  });
  if (!model) return null;

  const { chapters, skipped } = buildChartJourneyChapters({ model, track, collector });
  const timelineWeeks = buildTimelineWeeks(model);
  const anchored = attachChapterWeekAnchors({ chapters, model, timelineWeeks });
  const archetype = detectChartArchetype(model);

  const review = reviewChartJourneyExperience({
    chapters: anchored.chapters,
    skipped,
    weeksOnChart: model.metrics.weeksOnChart,
    peakPosition: model.metrics.peakPosition,
    archetype,
  });

  return {
    version: 2,
    rvtr,
    artist: track.artistName,
    title: track.title,
    generatedAt: new Date().toISOString(),
    visualLanguage: CHART_JOURNEY_VISUAL_LANGUAGE,
    model,
    timelineWeeks: anchored.timelineWeeks,
    chapterAnchors: anchored.anchors,
    track: {
      rvtr: track.rvtr,
      title: track.title,
      artistName: track.artistName,
      coverUrl: track.coverUrl,
      releaseYear: track.releaseYear,
      peakHot100: track.peakHot100,
      chartWeeks: track.chartWeeks,
    },
    chapters: anchored.chapters,
    skippedChapters: skipped,
    review,
  };
}

export async function loadChartJourneyWorkspace(
  rvtrInput: string,
): Promise<ChartJourneyWorkspacePayload | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  const track = await loadTrackPage(rvtr);
  if (!track || track.trajectoryWeeks.length === 0) {
    return { experience: null as unknown as ChartJourneyExperience, hasChartData: false };
  }

  const experience = await buildChartJourneyExperience(rvtr);
  if (!experience) return null;

  return { experience, hasChartData: true };
}
