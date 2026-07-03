/**
 * Sprint 3.32 — operator-readable summary, chapters, and audience sequence.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";

import { audienceLabelForPage } from "./sanitize-public-copy";
import type {
  DirectorAudienceStep,
  DirectorChapterView,
  DirectorOperatorSummary,
  DirectorSequenceViolation,
  DirectorStory,
  DirectorStoryPage,
  DirectorStoryboardBeat,
  DirectorStoryPlan,
} from "./types";

const CHAPTER_ORDER = [
  "hero",
  "introduction",
  "recording_story",
  "album_story",
  "chart_journey",
  "artist_journey",
  "performance_history",
  "song_dna",
  "cultural_impact",
  "legacy",
  "related_songs",
];

function chapterWarnings(
  story: DirectorStory,
  pages: DirectorStoryPage[],
  allPages: DirectorStoryPage[],
): string[] {
  const warnings: string[] = [];
  const headlines = pages.map((p) => p.headline.toLowerCase());
  const dupHeadline = headlines.find((h, i) => headlines.indexOf(h) !== i && h.length > 3);
  if (dupHeadline) warnings.push(`Duplicate headline "${dupHeadline}" in chapter`);

  let run = 1;
  for (let i = 1; i < pages.length; i++) {
    if (pages[i]!.templateId === pages[i - 1]!.templateId) run += 1;
    else run = 1;
    if (run >= 3) warnings.push(`3+ consecutive ${pages[i]!.templateId} pages`);
  }

  const factIds = pages.flatMap((p) => p.factIds);
  const dupFacts = factIds.filter((id, i) => factIds.indexOf(id) !== i);
  if (dupFacts.length) warnings.push("Repeated facts inside chapter");

  for (const page of pages) {
    const globalDup = allPages.filter(
      (p) =>
        p.id !== page.id &&
        p.factIds.some((id) => page.factIds.includes(id)),
    );
    if (globalDup.length && page.storyId === "recording_story") {
      warnings.push(`Fact reused on other pages (e.g. "${page.headline}")`);
      break;
    }
  }

  if (pages.length === 0 && story.status === "built") {
    warnings.push("Chapter built but no pages assigned");
  }

  return [...new Set(warnings)];
}

export function buildOperatorSummary(
  retrograph: Retrograph,
  plan: Pick<
    DirectorStoryPlan,
    | "stories"
    | "exhibits"
    | "pages"
    | "coverage"
    | "retrographSummary"
    | "discoveries"
    | "discoveryCoverage"
    | "experienceVariety"
    | "artDirectionConsistency"
  >,
  violations: DirectorSequenceViolation[],
  _hasSongDna: boolean,
): DirectorOperatorSummary {
  const built = plan.stories.filter((s) => s.status === "built");
  const blocking = violations.filter((v) => v.severity === "blocking");
  const varietyIssues = violations.filter((v) =>
    ["max_2_same_style", "no_repeat_fact_within_5", "no_duplicate_titles"].includes(v.rule),
  );

  const ranked = [...(plan.discoveries ?? [])].sort((a, b) => a.rank - b.rank);
  const majorDiscoveries = ranked.filter((d) => d.status === "used" || d.rank <= 6);
  const topThree = majorDiscoveries.slice(0, 3).map((d) => d.title);

  const strengths: string[] = topThree.map((t) => {
    if (/uk/i.test(t)) return "Unexpected UK #1 success";
    if (/bathroom/i.test(t)) return "Famous bathroom songwriting story";
    if (/muscle shoals/i.test(t)) return "Muscle Shoals recording legend";
    if (/performance|footage/i.test(t)) return "Strong live performance material";
    if (/chart|weeks/i.test(t)) return "Chart journey with real staying power";
    return t;
  });

  const weaknesses: string[] = [];
  if (varietyIssues.length > 0) {
    weaknesses.push(`${varietyIssues.length} sequencing variety rule${varietyIssues.length === 1 ? "" : "s"} flagged`);
  }
  if (plan.discoveryCoverage?.discoveriesIgnored) {
    const ignored = plan.discoveryCoverage.discoveriesIgnored;
    if (ignored > 0) weaknesses.push(`${ignored} interesting discovery${ignored === 1 ? "" : "ies"} not yet used`);
  }
  if (plan.experienceVariety?.varietyScore != null && plan.experienceVariety.varietyScore < 70) {
    weaknesses.push(`Experience variety score ${plan.experienceVariety.varietyScore}/100 — visual contrast needs work`);
  }
  if (plan.experienceVariety?.textHeavyWarnings?.length) {
    weaknesses.push(`${plan.experienceVariety.textHeavyWarnings.length} text-heavy page${plan.experienceVariety.textHeavyWarnings.length === 1 ? "" : "s"} without visual treatment`);
  }
  if (plan.artDirectionConsistency?.warnings?.length) {
    weaknesses.push(`${plan.artDirectionConsistency.warnings.length} art direction consistency warning${plan.artDirectionConsistency.warnings.length === 1 ? "" : "s"}`);
  }
  if (plan.coverage.factsUnused > 0) {
    weaknesses.push(`${plan.coverage.factsUnused} facts unused`);
  }
  if (blocking.length > 0) {
    weaknesses.push(blocking.map((b) => b.message).join("; "));
  }

  let publishReadiness: DirectorOperatorSummary["publishReadiness"] = "ready";
  let publishReadinessLabel = "Ready to publish";
  if (blocking.length > 0) {
    publishReadiness = "blocked";
    publishReadinessLabel = "Blocked — fix before publishing";
  } else if (varietyIssues.length > 0 || (plan.discoveryCoverage?.discoveriesIgnored ?? 0) > 2) {
    publishReadiness = "needs_review";
    publishReadinessLabel = "Needs review — discovery or variety gaps";
  }

  const mainStory = `${retrograph.song.title} by ${retrograph.song.artist}`;
  const discoveryCount = majorDiscoveries.length || ranked.length;

  const focusLine = strengths.includes("Unexpected UK #1 success")
    ? "The experience focuses on how the song grew from a US hit into an international success."
    : strengths.length >= 2
      ? `The experience builds around ${strengths.slice(0, 2).join(" and ").toLowerCase()}.`
      : "The experience builds from the strongest discoveries in the Retrograph.";

  const creativeBrief = [
    `This song contains ${discoveryCount} major discover${discoveryCount === 1 ? "y" : "ies"}.`,
    topThree.length
      ? `The strongest are: ${topThree.map((t) => `• ${t}`).join(" ")}`
      : "Core discoveries are still thin.",
    focusLine,
  ].join(" ");

  const narrativeParagraph = creativeBrief;

  return {
    mainStory,
    narrativeParagraph,
    creativeBrief,
    majorDiscoveryCount: discoveryCount,
    topDiscoveries: topThree,
    storyCount: built.length,
    exhibitCount: plan.exhibits.filter((e) => e.status === "built").length,
    pageCount: plan.pages.length,
    strengths,
    weaknesses,
    publishReadiness,
    publishReadinessLabel,
  };
}

export function buildAudienceSequence(
  pages: DirectorStoryPage[],
  storyboard: DirectorStoryboardBeat[],
  exhibits: DirectorStoryPlan["exhibits"],
): DirectorAudienceStep[] {
  const exhibitById = new Map(exhibits.map((e) => [e.id, e]));
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const ordered = storyboard.flatMap((b) =>
    b.pageIds.map((id) => pageById.get(id)).filter(Boolean),
  ) as DirectorStoryPage[];

  return ordered.map((page, index) => {
    const exhibit = exhibitById.get(page.exhibitId);
    const warnings: string[] = [];
    if (page.headline.toLowerCase() === "cultural impact") {
      warnings.push("Generic headline");
    }
    if (!page.supportingCopy && page.mediaIds.length === 0 && page.templateId !== "hero") {
      warnings.push("Empty page");
    }
    return {
      order: index + 1,
      pageId: page.id,
      label: audienceLabelForPage(page, exhibit?.title ?? page.title),
      templateId: page.templateId,
      storyId: page.storyId,
      warnings,
    };
  });
}

export function buildChapterViews(
  stories: DirectorStory[],
  storyboard: DirectorStoryboardBeat[],
  pages: DirectorStoryPage[],
  clusters: DirectorStoryPlan["clusters"],
): DirectorChapterView[] {
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const clusterByStory = new Map(clusters.map((c) => [c.storyId, c]));
  const beatByStory = new Map(storyboard.map((b) => [b.storyId, b]));

  const builtStories = stories.filter((s) => s.status === "built");
  const orderedStories = CHAPTER_ORDER.map((id) => builtStories.find((s) => s.id === id)).filter(
    Boolean,
  ) as DirectorStory[];

  return orderedStories.map((story, index) => {
    const beat = beatByStory.get(story.id);
    const chapterPages = (beat?.pageIds ?? story.pageIds)
      .map((id) => pageById.get(id))
      .filter(Boolean) as DirectorStoryPage[];
    const cluster = clusterByStory.get(story.id);

    return {
      order: index + 1,
      storyId: story.id,
      title: story.title,
      role: beat?.role ?? "act",
      purpose: story.whyCare,
      factCount: cluster?.factIds.length ?? story.factIds.length,
      mediaCount: cluster?.mediaIds.length ?? story.mediaIds.length,
      exhibitCount: story.exhibitIds.length,
      pageCount: chapterPages.length,
      warnings: chapterWarnings(story, chapterPages, pages),
      pageIds: chapterPages.map((p) => p.id),
    };
  });
}
