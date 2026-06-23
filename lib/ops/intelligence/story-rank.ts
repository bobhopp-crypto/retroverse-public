import type { CandidateFact, CandidateStory } from "./song-package-types";

function memorability(fact: CandidateFact, story: CandidateStory): number {
  let score = fact.importance;
  if (fact.category === "video" && /Chevy Chase|SNL/i.test(fact.factText)) score += 0.15;
  if (fact.category === "trivia" && /Boulez|accident|party/i.test(fact.factText)) score += 0.2;
  if (fact.category === "recording" && /reversed|synthesizer/i.test(fact.factText)) score += 0.15;
  if (story.hookType === "question") score += 0.05;
  return Math.min(1, score);
}

function surprise(fact: CandidateFact): number {
  if (fact.category === "trivia") return 0.9;
  if (/reversed|lip-sync|guitar synthesizer/i.test(fact.factText)) return 0.85;
  if (fact.category === "quote") return 0.6;
  return 0.45;
}

function culturalSignificance(fact: CandidateFact): number {
  if (fact.category === "cultural_impact" || fact.category === "tv_film") return 0.8;
  if (/Grammy|Billboard|Hot 100/i.test(fact.factText)) return 0.75;
  if (fact.category === "video") return 0.7;
  return 0.5;
}

function fanInterest(fact: CandidateFact): number {
  if (fact.category === "video") return 0.85;
  if (fact.extractionMethod === "deterministic" && fact.locked) return 0.55;
  return 0.65;
}

export function rankCandidateStories(
  stories: CandidateStory[],
  factsById: Map<string, CandidateFact>,
): CandidateStory[] {
  const scored = stories.map((story) => {
    const primary = factsById.get(story.primaryFactId);
    if (!primary) {
      return { ...story, rankScore: 0, reviewStatus: "rejected" as const };
    }

    const mem = memorability(primary, story);
    const surp = surprise(primary);
    const cult = culturalSignificance(primary);
    const fan = fanInterest(primary);
    const src = primary.confidence;

    const composite =
      0.3 * mem + 0.25 * surp + 0.2 * cult + 0.15 * fan + 0.1 * src;

    return {
      ...story,
      rankScore: Math.round(composite * 1000) / 1000,
    };
  });

  const sorted = [...scored].sort((a, b) => b.rankScore - a.rankScore);
  return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
}

export function autoApproveTopStories(stories: CandidateStory[], limit = 8): CandidateStory[] {
  return stories.map((s) => {
    if (s.reviewStatus === "rejected") return s;
    if (s.rank <= limit && s.rankScore >= 0.5) {
      return { ...s, reviewStatus: "approved" as const };
    }
    return s;
  });
}
