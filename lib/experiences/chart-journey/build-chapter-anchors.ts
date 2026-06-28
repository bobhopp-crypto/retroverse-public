import type { ChartJourneyModel } from "@/lib/chart-journey/types";

import type {
  ChartJourneyChapter,
  ChartJourneyChapterId,
  ChartJourneyChapterWeekAnchor,
  ChartJourneyTimelineWeek,
} from "./types";

function firstWeekAtOrBelow(model: ChartJourneyModel, threshold: number): number | null {
  const index = model.rows.findIndex((row) => row.week.rank <= threshold);
  return index >= 0 ? index : null;
}

function peakWeekIndex(model: ChartJourneyModel): number | null {
  const peak = model.metrics.peakPosition;
  if (peak == null) return null;
  const index = model.rows.findIndex((row) => row.week.rank === peak);
  return index >= 0 ? index : null;
}

function biggestClimbIndex(model: ChartJourneyModel): number {
  let best = 0;
  let bestDelta = 0;
  for (let i = 1; i < model.rows.length; i++) {
    const delta = model.rows[i]!.week.delta ?? 0;
    if (delta > bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }
  return best;
}

/** Attach week anchors to cinematic chapters and link timeline weeks back to chapters. */
export function attachChapterWeekAnchors(input: {
  chapters: ChartJourneyChapter[];
  model: ChartJourneyModel;
  timelineWeeks: ChartJourneyTimelineWeek[];
}): {
  chapters: ChartJourneyChapter[];
  timelineWeeks: ChartJourneyTimelineWeek[];
  anchors: ChartJourneyChapterWeekAnchor[];
} {
  const { model } = input;
  const anchorByChapter = new Map<ChartJourneyChapterId, number>();

  anchorByChapter.set("entered_charts", 0);
  anchorByChapter.set("rapid_rise", biggestClimbIndex(model));

  const top40 = firstWeekAtOrBelow(model, 40);
  if (top40 != null) anchorByChapter.set("top_40", top40);

  const top10 = firstWeekAtOrBelow(model, 10);
  if (top10 != null) anchorByChapter.set("top_10", top10);

  const peak = peakWeekIndex(model);
  if (peak != null) anchorByChapter.set("peak_week", peak);

  if (model.rows.length > 0) {
    anchorByChapter.set("longevity", model.rows.length - 1);
  }

  const chapters = input.chapters.map((chapter) => {
    const anchorWeekIndex = anchorByChapter.get(chapter.id);
    if (anchorWeekIndex == null) return chapter;

    let weekRange: [number, number] | undefined;
    if (chapter.id === "rapid_rise" && peak != null && anchorWeekIndex <= peak) {
      weekRange = [0, peak];
    } else if (chapter.id === "longevity") {
      weekRange = [Math.max(0, peak ?? 0), model.rows.length - 1];
    }

    return { ...chapter, anchorWeekIndex, weekRange };
  });

  const weekToChapters = new Map<number, ChartJourneyChapterId[]>();
  for (const [chapterId, weekIndex] of anchorByChapter) {
    const list = weekToChapters.get(weekIndex) ?? [];
    list.push(chapterId);
    weekToChapters.set(weekIndex, list);
  }

  const timelineWeeks = input.timelineWeeks.map((week) => ({
    ...week,
    linkedChapterIds: weekToChapters.get(week.weekIndex) ?? [],
  }));

  const anchors: ChartJourneyChapterWeekAnchor[] = chapters
    .filter((c) => c.anchorWeekIndex != null)
    .map((c) => ({
      chapterId: c.id,
      title: c.title,
      anchorWeekIndex: c.anchorWeekIndex!,
    }));

  return { chapters, timelineWeeks, anchors };
}
