import { randomUUID } from "crypto";

import { pickHeadlineTemplate } from "./story-templates";
import type { CandidateFact, CandidateStory, SongPackageMetadata } from "./song-package-types";

function supportingFactsFor(
  primary: CandidateFact,
  allFacts: CandidateFact[],
): CandidateFact[] {
  const support: CandidateFact[] = [];
  if (primary.category !== "album") {
    const album = allFacts.find(
      (f) => f.category === "album" && f.reviewStatus !== "rejected" && f.id !== primary.id,
    );
    if (album) support.push(album);
  }
  if (primary.category !== "chart" && primary.category !== "album") {
    const chart = allFacts.find(
      (f) =>
        f.category === "chart" &&
        f.locked &&
        f.reviewStatus !== "rejected" &&
        f.id !== primary.id,
    );
    if (chart && support.length < 2) support.push(chart);
  }
  return support.slice(0, 2);
}

export function proposeCandidateStories(
  facts: CandidateFact[],
  metadata: SongPackageMetadata,
): CandidateStory[] {
  const eligible = facts.filter(
    (f) =>
      f.reviewStatus !== "rejected" &&
      !f.mergedIntoId &&
      f.category !== "artist",
  );

  const stories: CandidateStory[] = [];
  const usedFactIds = new Set<string>();
  const usedHeadlines = new Set<string>();

  for (const fact of eligible) {
    if (usedFactIds.has(fact.id)) continue;
    if (fact.category === "artist") continue;

    const template = pickHeadlineTemplate(fact.category, fact.factText);
    const headline = template.build(fact.factText);
    if (usedHeadlines.has(headline.toLowerCase())) continue;
    const supporting = supportingFactsFor(fact, eligible).filter((s) => s.id !== fact.id);

    stories.push({
      id: randomUUID(),
      headline,
      hookType: template.hookType,
      primaryFactId: fact.id,
      supportingFactIds: supporting.map((s) => s.id),
      headlineMethod: "template",
      reviewStatus: fact.locked ? "approved" : "pending",
      rank: 0,
      rankScore: 0,
      createdAt: new Date().toISOString(),
    });
    usedFactIds.add(fact.id);
    usedHeadlines.add(headline.toLowerCase());
  }

  void metadata;
  return stories;
}
