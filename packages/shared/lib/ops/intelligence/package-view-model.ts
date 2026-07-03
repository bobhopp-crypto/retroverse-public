import { buildPackageIntel } from "./package-intel";
import type {
  CandidateFact,
  CandidateStory,
  FactCategory,
  ResearchVaultEntry,
  SongPackage,
  StoryCard,
} from "./song-package-types";

export type FactGroupKey =
  | "Origin"
  | "Recording"
  | "Video"
  | "Performance"
  | "Chart"
  | "Artist"
  | "Album"
  | "Cultural"
  | "Quote";

export type PackageStats = {
  sources: number;
  facts: number;
  stories: number;
  quotes: number;
  relatedSongs: number;
  relatedArtists: number;
  assets: number;
};

export type PackageHealth = {
  sourceCoverage: number;
  factCoverage: number;
  storyCoverage: number;
  confidence: number;
};

export type ArtifactStatus = {
  id: string;
  label: string;
  ready: boolean;
  note: string;
};

export type DisplayStory = {
  id: string;
  headline: string;
  hookType: string;
  confidence: number;
  supportingFacts: string[];
  rank: number;
};

export type PackageRelationships = {
  song: { rvtr: string; title: string };
  album: { title: string; year: number | null } | null;
  artist: { name: string };
  relatedSongs: Array<{ rvtr: string; title: string }>;
  relatedArtists: Array<{ name: string }>;
};

export type PackageViewModel = {
  pkg: SongPackage;
  stats: PackageStats;
  health: PackageHealth;
  artifacts: ArtifactStatus[];
  factGroups: Record<FactGroupKey, CandidateFact[]>;
  stories: DisplayStory[];
  relationships: PackageRelationships;
};

const FACT_GROUP_MAP: Record<FactCategory, FactGroupKey> = {
  trivia: "Origin",
  recording: "Recording",
  video: "Video",
  performance: "Performance",
  chart: "Chart",
  artist: "Artist",
  album: "Album",
  cultural_impact: "Cultural",
  tv_film: "Cultural",
  quote: "Quote",
};

function activeFacts(facts: CandidateFact[]): CandidateFact[] {
  return facts.filter((f) => f.reviewStatus !== "rejected" && !f.mergedIntoId);
}

function groupFacts(facts: CandidateFact[]): Record<FactGroupKey, CandidateFact[]> {
  const groups: Record<FactGroupKey, CandidateFact[]> = {
    Origin: [],
    Recording: [],
    Video: [],
    Performance: [],
    Chart: [],
    Artist: [],
    Album: [],
    Cultural: [],
    Quote: [],
  };
  for (const fact of activeFacts(facts)) {
    groups[FACT_GROUP_MAP[fact.category]].push(fact);
  }
  for (const key of Object.keys(groups) as FactGroupKey[]) {
    groups[key].sort((a, b) => b.importance - a.importance || b.confidence - a.confidence);
  }
  return groups;
}

function storiesFromPackage(
  pkg: SongPackage,
  factsById: Map<string, CandidateFact>,
): DisplayStory[] {
  const fromCandidates = pkg.candidateStories
    .filter((s) => s.reviewStatus !== "rejected")
    .sort((a, b) => a.rank - b.rank)
    .map((s) => storyFromCandidate(s, factsById));

  if (fromCandidates.length > 0) return fromCandidates;
  return storiesFromCards(pkg.storyCards);
}

function storyFromCandidate(
  story: CandidateStory,
  factsById: Map<string, CandidateFact>,
): DisplayStory {
  const primary = factsById.get(story.primaryFactId);
  const supporting = story.supportingFactIds
    .map((id) => factsById.get(id)?.factText)
    .filter((t): t is string => !!t);
  if (primary && !supporting.includes(primary.factText)) {
    supporting.unshift(primary.factText);
  }
  return {
    id: story.id,
    headline: story.headline,
    hookType: story.hookType,
    confidence: primary?.confidence ?? story.rankScore,
    supportingFacts: supporting.length > 0 ? supporting : primary ? [primary.factText] : [],
    rank: story.rank,
  };
}

function storiesFromCards(cards: StoryCard[]): DisplayStory[] {
  return cards
    .filter((c) => c.rank > 0 && !c.hidden)
    .sort((a, b) => a.rank - b.rank)
    .map((c) => ({
      id: c.id,
      headline: c.headline,
      hookType: c.category,
      confidence: c.confidence,
      supportingFacts: c.supportingContext ? [c.fact, c.supportingContext] : [c.fact],
      rank: c.rank,
    }));
}

function computeStats(
  pkg: SongPackage,
  relationships: PackageRelationships,
): PackageStats {
  const facts = activeFacts(pkg.candidateFacts);
  const stories =
    pkg.candidateStories.filter((s) => s.reviewStatus !== "rejected").length ||
    pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden).length;

  let assets = 0;
  if (pkg.metadata.coverUrl) assets += 1;
  if (pkg.metadata.hasVdjMedia) assets += 1;
  if (pkg.metadata.videoInfo) assets += 1;

  return {
    sources: pkg.researchVault.length,
    facts: facts.length || pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden).length,
    stories,
    quotes: facts.filter((f) => f.category === "quote").length,
    relatedSongs: relationships.relatedSongs.length,
    relatedArtists: relationships.relatedArtists.length,
    assets,
  };
}

function computeHealth(pkg: SongPackage, stats: PackageStats): PackageHealth {
  const sourceTarget = 8;
  const factTarget = 25;
  const storyTarget = 10;

  const sourceCoverage = Math.min(100, Math.round((stats.sources / sourceTarget) * 100));
  const factCoverage = Math.min(100, Math.round((stats.facts / factTarget) * 100));
  const storyCoverage = Math.min(100, Math.round((stats.stories / storyTarget) * 100));

  const confidences: number[] = [
    ...pkg.researchVault.map((s) => s.confidence),
    ...activeFacts(pkg.candidateFacts).map((f) => f.confidence),
  ];
  if (confidences.length === 0 && pkg.storyCards.length > 0) {
    confidences.push(...pkg.storyCards.filter((c) => !c.hidden).map((c) => c.confidence));
  }
  const confidence =
    confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
      : 0;

  return { sourceCoverage, factCoverage, storyCoverage, confidence };
}

function computeArtifacts(pkg: SongPackage, stats: PackageStats): ArtifactStatus[] {
  const intel = pkg.intel;
  const storyCount = stats.stories;

  return [
    {
      id: "record_label",
      label: "Record Label Card",
      ready: Boolean(intel?.label || intel?.catalogNumber),
      note: intel?.label ? `${intel.label}` : "Label from research vault",
    },
    {
      id: "timeline",
      label: "Timeline Infographic",
      ready: (intel?.timelineEvents.length ?? 0) >= 2,
      note: `${intel?.timelineEvents.length ?? 0} timeline events`,
    },
    {
      id: "story_map",
      label: "Story Map",
      ready: storyCount >= 2,
      note: `${storyCount} discovered stories`,
    },
    {
      id: "song_dna",
      label: "Song DNA Card",
      ready:
        (intel?.recordingFacts.length ?? 0) +
          (intel?.videoFacts.length ?? 0) +
          (intel?.chartHistory.length ?? 0) >=
        2,
      note: "Recording, video, and chart strands",
    },
  ];
}

export function sourceLabel(fact: CandidateFact): string {
  if (fact.sourceType === "canonical") return "Retroverse";
  if (fact.sourceUrl?.includes("wikipedia.org")) return "Wikipedia";
  return fact.sourceId.startsWith("wiki") ? "Wikipedia" : "Research";
}

export function formatStatus(status: SongPackage["status"]): string {
  const labels: Record<SongPackage["status"], string> = {
    draft: "Draft",
    processing: "Processing",
    review: "Research Complete",
    cards_ready: "Story ready",
    approved: "Approved",
    published: "Published",
  };
  return labels[status] ?? status;
}

export function excerptPreview(excerpt: string, max = 220): string {
  const t = excerpt.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function buildPackageViewModel(
  pkg: SongPackage,
  relationships: PackageRelationships,
): PackageViewModel {
  const factsById = new Map(activeFacts(pkg.candidateFacts).map((f) => [f.id, f]));
  const stats = computeStats(pkg, relationships);
  const factGroups = groupFacts(pkg.candidateFacts);
  const intel = pkg.intel ?? buildPackageIntel(pkg);
  const pkgWithIntel = { ...pkg, intel };

  if (stats.facts === 0 && pkg.storyCards.length > 0) {
    for (const card of pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden)) {
      const key = FACT_GROUP_MAP[card.category] ?? "Origin";
      factGroups[key].push({
        id: card.id,
        category: card.category,
        factText: card.fact,
        sourceType: "research_vault",
        sourceId: card.storyId,
        sourceUrl: card.sourceUrl,
        sourceExcerpt: card.sourceExcerpt,
        excerptAnchor: card.fact.slice(0, 40),
        confidence: card.confidence,
        importance: card.confidence,
        locked: false,
        extractionMethod: "deterministic",
        reviewStatus: "approved",
        createdAt: pkg.processedAt ?? pkg.updatedAt,
      });
    }
  }

  return {
    pkg: pkgWithIntel,
    stats,
    health: computeHealth(pkgWithIntel, stats),
    artifacts: computeArtifacts(pkgWithIntel, stats),
    factGroups,
    stories: storiesFromPackage(pkgWithIntel, factsById),
    relationships,
  };
}

export function defaultRelationships(pkg: SongPackage): PackageRelationships {
  return {
    song: { rvtr: pkg.rvtr, title: pkg.metadata.title },
    album: pkg.metadata.albumTitle
      ? { title: pkg.metadata.albumTitle, year: pkg.metadata.year }
      : null,
    artist: { name: pkg.metadata.artist },
    relatedSongs: [],
    relatedArtists: [],
  };
}

export function vaultSourceName(entry: ResearchVaultEntry): string {
  if (entry.source) return entry.source;
  if (entry.id.startsWith("wiki")) return "Wikipedia";
  if (entry.id === "retroverse-chart") return "Retroverse Chart";
  if (entry.id === "retroverse-vdj") return "VirtualDJ Library";
  return "Research";
}
