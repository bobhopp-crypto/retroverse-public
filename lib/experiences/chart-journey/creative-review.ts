import type { ChartJourneyChapter, ChartJourneyCreativeReview } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function reviewChartJourneyExperience(input: {
  chapters: ChartJourneyChapter[];
  skipped: ChartJourneyChapter[];
  weeksOnChart: number;
  peakPosition: number | null;
  archetype: string;
}): ChartJourneyCreativeReview {
  const { chapters, skipped, weeksOnChart, peakPosition, archetype } = input;
  const hasPeak = chapters.some((c) => c.id === "peak_week");
  const hasRise = chapters.some((c) => c.id === "rapid_rise");
  const hasIntl = chapters.some((c) => c.id === "international");
  const hasLegacy = chapters.some((c) => c.id === "legacy");
  const hasLongevity = chapters.some((c) => c.id === "longevity");
  const chapterCount = chapters.length;

  const narrativeExcitement = clamp(
    55 +
      (hasRise ? 12 : 0) +
      (hasPeak ? 15 : 0) +
      (hasIntl ? 8 : 0) +
      (archetype === "rocket" || archetype === "re_entry" ? 10 : 0),
  );

  const visualExcitement = clamp(
    60 + chapterCount * 4 + (hasPeak ? 10 : 0) + (hasRise ? 8 : 0),
  );

  const historicalClarity = clamp(
    50 +
      (peakPosition != null ? 15 : 0) +
      (weeksOnChart >= 10 ? 10 : 0) +
      chapters.filter((c) => c.id === "entered_charts" || c.id === "release").length * 8,
  );

  const momentum = clamp(
    45 +
      (hasRise ? 20 : 0) +
      (hasLongevity ? 10 : 0) +
      Math.min(chapterCount * 3, 18),
  );

  const ending = clamp(40 + (hasLegacy ? 25 : 0) + (hasLongevity ? 15 : 0) + (hasIntl ? 10 : 0));

  const educationalValue = clamp(
    55 + (peakPosition != null ? 10 : 0) + (weeksOnChart >= 15 ? 10 : 0) + (hasIntl ? 8 : 0),
  );

  const replayValue = clamp(
    50 +
      chapterCount * 5 +
      (hasRise ? 10 : 0) +
      (skipped.some((s) => s.id === "competition") ? 5 : 0),
  );

  const dimensions: ChartJourneyCreativeReview["dimensions"] = [
    {
      id: "narrativeExcitement",
      label: "Narrative excitement",
      score: narrativeExcitement,
      note: hasRise && hasPeak ? "Strong rise → peak arc" : "Add climb or peak beats for drama",
    },
    {
      id: "visualExcitement",
      label: "Visual excitement",
      score: visualExcitement,
      note: `${chapterCount} active chapters — motion on climb, peak, and longevity`,
    },
    {
      id: "historicalClarity",
      label: "Historical clarity",
      score: historicalClarity,
      note: peakPosition != null ? `Peak #${peakPosition} · ${weeksOnChart} weeks` : "Peak data missing",
    },
    {
      id: "momentum",
      label: "Momentum",
      score: momentum,
      note: hasRise ? "Chart climb drives pacing" : "Consider emphasizing debut-to-peak movement",
    },
    {
      id: "ending",
      label: "Ending",
      score: ending,
      note: hasLegacy ? "Legacy chapter closes the story" : "Legacy thread would strengthen the finish",
    },
    {
      id: "educationalValue",
      label: "Educational value",
      score: educationalValue,
      note: "Teaches chart mechanics through story beats, not stat tables",
    },
    {
      id: "replayValue",
      label: "Replay value",
      score: replayValue,
      note: skipped.some((s) => s.id === "competition")
        ? "Competition chapter awaits chart-week graph — high replay upside"
        : "Expandable week points invite return visits",
    },
  ];

  const overallScore = clamp(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  );

  let verdict = "Promising draft — keep building wonder";
  if (overallScore >= 85) verdict = "Signature experience — ready for patron preview";
  else if (overallScore >= 72) verdict = "Strong journey — polish peak and legacy beats";
  else if (overallScore >= 60) verdict = "Good bones — add missing chapters where data exists";

  return { overallScore, verdict, dimensions };
}
