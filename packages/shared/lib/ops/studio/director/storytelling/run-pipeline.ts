/**
 * Sprint 3.31–3.36 — Full storytelling pipeline orchestrator.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";
import { usableRetrographFacts } from "@/lib/ops/studio/retrograph/build-retrograph";
import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import type { CoachingRuleHints } from "../coaching/types";
import {
  buildArtDirectionConsistency,
  buildArtDirectionOverview,
} from "./art-direction-audit";
import {
  buildAudienceSequence,
  buildChapterViews,
  buildOperatorSummary,
} from "./build-operator-view";
import {
  buildExperienceOpportunities,
  buildNarrativeChapters,
} from "./build-opportunities";
import { buildStoryClusters } from "./build-clusters";
import { buildPagesFromExhibits } from "./build-pages";
import { buildStoryboard } from "./build-storyboard";
import { buildCoverageReport } from "./coverage-report";
import { buildDiscoveryCoverage, markDiscoveryUsage } from "./discovery-coverage";
import {
  attachPageIdsToArtDirections,
  designArtDirectionBriefs,
  designPageArtDirections,
} from "./design-art-direction";
import { designExperienceConcepts } from "./design-experiences";
import { designVisualConcepts } from "./design-visual-concepts";
import { designExhibits } from "./design-exhibits";
import { discoverInteresting } from "./discover-interests";
import { discoverStories } from "./discover-stories";
import { enforceExperienceVariety } from "./enforce-experience-variety";
import { enforceSequenceVariety } from "./enforce-sequence-variety";
import { buildExperienceVarietyAudit } from "./experience-variety-audit";
import { pagesToExperiencePlan } from "./pages-to-experience-plan";
import { rankDiscoveries } from "./rank-discoveries";
import type { DirectorStoryPlan, StorytellingPipelineResult } from "./types";

export type StorytellingPipelineOptions = {
  hasSongDna?: boolean;
};

export function runStorytellingPipeline(
  handoff: DirectorEditorialPackage,
  retrograph: Retrograph,
  _coachingHints?: CoachingRuleHints | null,
  options?: StorytellingPipelineOptions,
): StorytellingPipelineResult {
  const rawDiscoveries = discoverInteresting(retrograph);
  const rankedDiscoveries = rankDiscoveries(rawDiscoveries);
  const opportunities = buildExperienceOpportunities(rankedDiscoveries);
  const narrativeChapters = buildNarrativeChapters(rankedDiscoveries, opportunities);

  const stories = discoverStories(retrograph, {
    opportunities,
    hasSongDna: options?.hasSongDna,
  });

  const experienceConcepts = designExperienceConcepts(stories, rankedDiscoveries, retrograph);

  const clusters = buildStoryClusters(retrograph, stories);
  const exhibits = designExhibits(retrograph, stories, clusters);
  let visualConcepts = designVisualConcepts(experienceConcepts, exhibits, stories, retrograph);

  const artDirectionBriefs = designArtDirectionBriefs(
    experienceConcepts,
    stories,
    rankedDiscoveries,
    retrograph,
  );
  let pageArtDirections = designPageArtDirections(
    artDirectionBriefs,
    visualConcepts,
    experienceConcepts,
  );

  let pages = buildPagesFromExhibits(retrograph, handoff, stories, exhibits, visualConcepts);
  pageArtDirections = attachPageIdsToArtDirections(pageArtDirections, pages);
  let storyboard = buildStoryboard(stories, pages, {
    discoveries: rankedDiscoveries,
    opportunities,
  });

  const variety = enforceSequenceVariety(pages, storyboard, retrograph, {
    hasSongDna: options?.hasSongDna ?? false,
  });
  pages = variety.pages;
  storyboard = variety.storyboard;

  const expVariety = enforceExperienceVariety(
    pages,
    visualConcepts,
    storyboard.flatMap((b) => b.pageIds),
  );
  pages = expVariety.pages;
  visualConcepts = expVariety.visualConcepts;

  const experienceVariety = buildExperienceVarietyAudit(
    pages,
    visualConcepts,
    experienceConcepts,
    expVariety.violations,
    storyboard.flatMap((b) => b.pageIds),
  );

  const artDirectionConsistency = buildArtDirectionConsistency(artDirectionBriefs);
  const artDirectionOverview = buildArtDirectionOverview(
    artDirectionBriefs,
    artDirectionConsistency,
    storyboard,
    retrograph.song.year,
  );

  const coverage = buildCoverageReport(retrograph, stories, exhibits, pages);
  const discoveryCoverage = buildDiscoveryCoverage(retrograph, rankedDiscoveries, stories, pages);
  const discoveries = markDiscoveryUsage(rankedDiscoveries, discoveryCoverage);

  const facts = usableRetrographFacts(retrograph);

  const summary = buildOperatorSummary(
    retrograph,
    {
      stories,
      exhibits,
      pages,
      coverage,
      discoveries,
      discoveryCoverage,
      experienceVariety,
      artDirectionConsistency,
      retrographSummary: {
        rvtr: retrograph.entity.rvtr,
        artist: retrograph.song.artist,
        title: retrograph.song.title,
        factCount: facts.length,
        pendingFactCount: retrograph.pendingFacts.length,
        mediaCount: retrograph.media.images.length,
        relationshipCount: retrograph.relationships.length,
        timelineCount: retrograph.timeline.length,
      },
    },
    variety.violations,
    options?.hasSongDna ?? false,
  );

  const audienceSequence = buildAudienceSequence(pages, storyboard, exhibits);
  const chapters = buildChapterViews(stories, storyboard, pages, clusters);

  const storyPlan: DirectorStoryPlan = {
    version: 5,
    generatedAt: new Date().toISOString(),
    retrographSummary: {
      rvtr: retrograph.entity.rvtr,
      artist: retrograph.song.artist,
      title: retrograph.song.title,
      factCount: facts.length,
      pendingFactCount: retrograph.pendingFacts.length,
      mediaCount: retrograph.media.images.length,
      relationshipCount: retrograph.relationships.length,
      timelineCount: retrograph.timeline.length,
    },
    discoveries,
    opportunities,
    narrativeChapters,
    discoveryCoverage,
    experienceConcepts,
    visualConcepts,
    experienceVariety,
    artDirectionBriefs,
    pageArtDirections,
    artDirectionConsistency,
    artDirectionOverview,
    stories,
    clusters,
    exhibits,
    pages,
    storyboard,
    coverage,
    summary,
    audienceSequence,
    chapters,
    sequenceViolations: variety.violations,
  };

  const experiencePlan = pagesToExperiencePlan(handoff, pages, storyboard);

  return { storyPlan, experiencePlan, sequenceViolations: variety.violations };
}
