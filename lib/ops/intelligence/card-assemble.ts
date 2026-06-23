import { randomUUID } from "crypto";

import type {
  CandidateFact,
  CandidateStory,
  SongPackageMetadata,
  StoryCard,
} from "./song-package-types";

function sourceLabel(fact: CandidateFact): string {
  if (fact.sourceType === "canonical") return "Retroverse";
  if (fact.sourceUrl?.includes("wikipedia.org")) return "Wikipedia";
  return fact.sourceId.startsWith("wiki") ? "Wikipedia" : "Research";
}

export function assembleCoverCard(metadata: SongPackageMetadata): StoryCard {
  const parts: string[] = [];
  parts.push(`${metadata.title} by ${metadata.artist}.`);
  if (metadata.albumTitle && metadata.year) {
    parts.push(`From ${metadata.albumTitle} (${metadata.year}).`);
  }
  if (metadata.peakHot100 != null) {
    parts.push(`Billboard Hot 100 peak: #${metadata.peakHot100}.`);
  }

  return {
    id: randomUUID(),
    storyId: "cover",
    rank: 0,
    headline: metadata.title,
    fact: parts.join(" "),
    sourceLabel: "Retroverse",
    sourceUrl: null,
    sourceExcerpt: `Canonical metadata for ${metadata.rvtr}`,
    confidence: 1,
    category: "artist",
  };
}

export function assembleStoryCards(input: {
  metadata: SongPackageMetadata;
  stories: CandidateStory[];
  factsById: Map<string, CandidateFact>;
  maxCards?: number;
}): StoryCard[] {
  const max = input.maxCards ?? 8;
  const approved = input.stories
    .filter((s) => s.reviewStatus === "approved")
    .sort((a, b) => a.rank - b.rank)
    .slice(0, max);

  const cards: StoryCard[] = [assembleCoverCard(input.metadata)];

  for (const story of approved) {
    const primary = input.factsById.get(story.primaryFactId);
    if (!primary || primary.reviewStatus === "rejected") continue;

    const supporting = story.supportingFactIds
      .map((id) => input.factsById.get(id))
      .filter((f): f is CandidateFact => !!f && f.reviewStatus !== "rejected")
      .map((f) => f.factText);

    cards.push({
      id: randomUUID(),
      storyId: story.id,
      rank: story.rank,
      headline: story.headline,
      fact: primary.factText,
      supportingContext: supporting.length > 0 ? supporting.join(" · ") : undefined,
      sourceLabel: sourceLabel(primary),
      sourceUrl: primary.sourceUrl,
      sourceExcerpt: primary.sourceExcerpt.slice(0, 500),
      confidence: primary.confidence,
      category: primary.category,
    });
  }

  return cards;
}

export function canBuildCards(stories: CandidateStory[], facts: CandidateFact[]): {
  ok: boolean;
  reason?: string;
} {
  const approvedFacts = facts.filter((f) => f.reviewStatus === "approved");
  const approvedStories = stories.filter((s) => s.reviewStatus === "approved");

  if (approvedFacts.length < 3) {
    return { ok: false, reason: "Need at least 3 approved facts." };
  }
  if (approvedStories.length < 1) {
    return { ok: false, reason: "Need at least 1 approved story." };
  }

  for (const story of approvedStories) {
    const primary = facts.find((f) => f.id === story.primaryFactId);
    if (!primary || primary.reviewStatus === "rejected") {
      return { ok: false, reason: "An approved story references a rejected or missing fact." };
    }
  }

  return { ok: true };
}
