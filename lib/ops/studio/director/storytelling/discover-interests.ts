/**
 * Sprint 3.34 — Discovery Engine: find what is genuinely interesting.
 */

import type { Retrograph, RetrographFact } from "@/lib/ops/studio/retrograph/types";
import { usableRetrographFacts } from "@/lib/ops/studio/retrograph/build-retrograph";

import type { DirectorInterestingDiscovery } from "./types";

type DiscoveryProbe = {
  id: string;
  title: string;
  whyItMatters: string;
  category: DirectorInterestingDiscovery["category"];
  potentialExperiences: string[];
  probe: (ctx: { retrograph: Retrograph; facts: RetrographFact[] }) => {
    eligible: boolean;
    factIds: string[];
    mediaIds?: string[];
    confidence: number;
    whyOverride?: string;
  };
};

function factsMatching(
  facts: RetrographFact[],
  opts: { categories?: string[]; keywords?: RegExp[] },
): RetrographFact[] {
  return facts.filter((f) => {
    if (opts.categories?.length && !opts.categories.includes(f.category)) return false;
    if (opts.keywords?.length && !opts.keywords.some((re) => re.test(f.text))) return false;
    return true;
  });
}

const DISCOVERY_PROBES: DiscoveryProbe[] = [
  {
    id: "uk_number_one_surprise",
    title: "UK #1 Surprise",
    category: "unexpected_chart_success",
    whyItMatters:
      "The song reached #6 in the United States but became a #1 hit in the United Kingdom a year later.",
    potentialExperiences: ["Chart Journey", "Legacy", "Cultural Impact"],
    probe: ({ facts }) => {
      const uk = factsMatching(facts, { keywords: [/number one in the uk|uk singles chart/i] });
      const us = factsMatching(facts, { keywords: [/peak.*#6|#6 on the billboard/i] });
      return {
        eligible: uk.length > 0,
        factIds: [...uk, ...us].map((f) => f.id),
        confidence: uk.length > 0 && us.length > 0 ? 98 : 85,
      };
    },
  },
  {
    id: "bathroom_pitch",
    title: "Bathroom Pitch",
    category: "rare_recording_story",
    whyItMatters:
      "The songwriter conceived the song after hearing an idea in a restroom conversation — a defining recording anecdote.",
    potentialExperiences: ["Recording Story", "Songwriting", "Documentary Opening"],
    probe: ({ facts }) => ({
      eligible: factsMatching(facts, { keywords: [/bathroom|pitch him the song/i] }).length > 0,
      factIds: factsMatching(facts, { keywords: [/bathroom|pitch him the song/i] }).map((f) => f.id),
      confidence: 96,
    }),
  },
  {
    id: "muscle_shoals_session",
    title: "Muscle Shoals Session",
    category: "famous_studio",
    whyItMatters: "Recorded at Muscle Shoals Sound Studio — legendary room in American pop history.",
    potentialExperiences: ["Recording Story", "Studio Exhibit"],
    probe: ({ facts, retrograph }) => ({
      eligible: factsMatching(facts, { keywords: [/muscle shoals/i] }).length > 0,
      factIds: factsMatching(facts, { keywords: [/muscle shoals/i] }).map((f) => f.id),
      mediaIds: retrograph.media.images.slice(0, 1).map((i) => i.assetId),
      confidence: 92,
    }),
  },
  {
    id: "chart_longevity",
    title: "25 Weeks on the Hot 100",
    category: "chart_journey",
    whyItMatters: "Peak #6 with 25 weeks on chart — staying power, not a one-week flash.",
    potentialExperiences: ["Chart Journey", "Legacy"],
    probe: ({ retrograph, facts }) => ({
      eligible: retrograph.charts.peakHot100 != null,
      factIds: factsMatching(facts, { categories: ["chart"] }).map((f) => f.id),
      confidence: retrograph.charts.chartWeeks != null ? 94 : 88,
    }),
  },
  {
    id: "belated_international_hit",
    title: "Belated International Hit",
    category: "cultural_influence",
    whyItMatters: "Broke internationally after the initial US run — a second act for the story.",
    potentialExperiences: ["Chart Journey", "Cultural Impact"],
    probe: ({ facts }) => ({
      eligible: factsMatching(facts, { keywords: [/canada and australia|international hit/i] }).length > 0,
      factIds: factsMatching(facts, { keywords: [/canada and australia|international/i] }).map((f) => f.id),
      confidence: 88,
    }),
  },
  {
    id: "seventh_album_turning_point",
    title: "Seventh Album Turning Point",
    category: "career_turning_point",
    whyItMatters: "Pleasure and Pain was the band's seventh album — a deep-career breakthrough.",
    potentialExperiences: ["Album Story", "Artist Journey"],
    probe: ({ facts, retrograph }) => {
      const matched = factsMatching(facts, { keywords: [/seventh album|pleasure/i] });
      return {
        eligible: matched.length > 0 || Boolean(retrograph.album.title),
        factIds: matched.map((f) => f.id),
        confidence: 86,
      };
    },
  },
  {
    id: "performance_footage",
    title: "Live Performance Footage",
    category: "rare_footage",
    whyItMatters: "Owned performance captures show the song on stage — beyond the studio take.",
    potentialExperiences: ["Performance History", "Official Video"],
    probe: ({ retrograph }) => ({
      eligible: retrograph.performances.length > 0,
      factIds: [],
      mediaIds: retrograph.media.images.filter((i) => i.performanceId).map((i) => i.assetId),
      confidence: 90,
    }),
  },
  {
    id: "gold_certification",
    title: "Gold Certification",
    category: "awards",
    whyItMatters: "RIAA Gold certification — concrete commercial legacy marker.",
    potentialExperiences: ["Legacy", "Album Story"],
    probe: ({ facts }) => ({
      eligible: factsMatching(facts, { keywords: [/certified gold|riaa/i] }).length > 0,
      factIds: factsMatching(facts, { keywords: [/certified gold|riaa/i] }).map((f) => f.id),
      confidence: 84,
    }),
  },
  {
    id: "songwriter_even_stevens",
    title: "Songwriter Even Stevens",
    category: "famous_collaborator",
    whyItMatters: "Even Stevens wrote the song — a named creative voice behind the hit.",
    potentialExperiences: ["Recording Story", "Songwriter Exhibit"],
    probe: ({ facts }) => ({
      eligible: factsMatching(facts, { keywords: [/even stevens/i] }).length > 0,
      factIds: factsMatching(facts, { keywords: [/even stevens/i] }).map((f) => f.id),
      confidence: 88,
    }),
  },
  {
    id: "dual_album_pressing",
    title: "Dual Album Pressing",
    category: "historical_coincidence",
    whyItMatters: "Two different track line-ups on vinyl — a detail collectors remember.",
    potentialExperiences: ["Album Story", "Historical Context"],
    probe: ({ facts }) => ({
      eligible: factsMatching(facts, { keywords: [/two different track|track line-up/i] }).length > 0,
      factIds: factsMatching(facts, { keywords: [/two different track|track line-up/i] }).map((f) => f.id),
      confidence: 78,
    }),
  },
  {
    id: "missing_research_depth",
    title: "Unexplored Artist Depth",
    category: "missing_research",
    whyItMatters: "Artist relationship depth is unknown — interesting gap worth researching.",
    potentialExperiences: ["Artist Journey", "Research Brief"],
    probe: ({ retrograph }) => ({
      eligible: retrograph.unknowns.some((u) => /artist relationship/i.test(u)),
      factIds: [],
      confidence: 55,
    }),
  },
];

export function discoverInteresting(retrograph: Retrograph): DirectorInterestingDiscovery[] {
  const facts = usableRetrographFacts(retrograph);
  const relationshipIds = retrograph.relationships.map((r) => r.id);
  const out: DirectorInterestingDiscovery[] = [];

  for (const probe of DISCOVERY_PROBES) {
    const result = probe.probe({ retrograph, facts });
    if (!result.eligible) continue;

    out.push({
      id: probe.id,
      title: probe.title,
      whyItMatters: result.whyOverride ?? probe.whyItMatters,
      category: probe.category,
      factIds: [...new Set(result.factIds)],
      mediaIds: result.mediaIds ?? [],
      relationshipIds: result.factIds.length ? relationshipIds.slice(0, 3) : [],
      confidence: result.confidence,
      potentialExperiences: probe.potentialExperiences,
      status: "found",
      ignoreReason: null,
      rank: 0,
      scores: {
        audienceInterest: 0,
        historicalSignificance: 0,
        emotionalImpact: 0,
        visualPotential: 0,
        researchConfidence: 0,
        uniqueness: 0,
        composite: 0,
      },
    });
  }

  return out;
}
