import type { SongDnaChapter, SongDnaCreativeReview } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function reviewSongDnaExperience(input: {
  chapters: SongDnaChapter[];
  skipped: SongDnaChapter[];
  hasVisual: boolean;
  hasMusical: boolean;
  signalCount: number;
}): SongDnaCreativeReview {
  const { chapters, skipped, hasVisual, hasMusical, signalCount } = input;
  const chapterCount = chapters.length;

  const dimensions: SongDnaCreativeReview["dimensions"] = [
    {
      id: "emotionalEngagement",
      label: "Emotional engagement",
      score: clamp(55 + chapterCount * 4 + (hasMusical ? 12 : 0)),
      note: hasMusical ? "Energy + valence drive feeling" : "Add musical signals for depth",
    },
    {
      id: "visualRichness",
      label: "Visual richness",
      score: clamp(50 + chapterCount * 5 + (hasVisual ? 15 : 0)),
      note: hasVisual ? "Artwork-derived palette wired" : "Visual DNA pending",
    },
    {
      id: "accessibility",
      label: "Accessibility",
      score: clamp(70 + (chapterCount >= 7 ? 10 : 0)),
      note: "Plain language — no music theory required",
    },
    {
      id: "personalityClarity",
      label: "Personality clarity",
      score: clamp(60 + (chapters.some((c) => c.id === "identity") ? 20 : 0)),
      note: "Identity chapter establishes fingerprint first",
    },
    {
      id: "pacing",
      label: "Pacing",
      score: clamp(55 + chapterCount * 3),
      note: `${chapterCount} beats — rhythm and energy accelerate mid-journey`,
    },
    {
      id: "ending",
      label: "Ending",
      score: clamp(45 + (chapters.some((c) => c.id === "legacy") ? 25 : 0)),
      note: chapters.some((c) => c.id === "legacy") ? "Legacy closes with meaning" : "Add legacy beat",
    },
    {
      id: "replayValue",
      label: "Replay value",
      score: clamp(50 + signalCount + skipped.length * 3),
      note: `${skipped.length} future chapters unlock as data grows`,
    },
  ];

  const overallScore = clamp(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);

  let verdict = "Promising DNA exhibit — keep building wonder";
  if (overallScore >= 85) verdict = "Signature experience — ready for patron preview";
  else if (overallScore >= 72) verdict = "Strong Song DNA — polish production and neighbors";
  else if (overallScore >= 60) verdict = "Good foundation — enrich instrumentation and legacy";

  return { overallScore, verdict, dimensions };
}
