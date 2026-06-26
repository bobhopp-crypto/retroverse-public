import "server-only";

import { existsSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

import { loadArchiveRecords } from "../build-live-archive";
import { loadAllStarSnapshot } from "../load-allstar";
import type { AllStarArchiveRecord } from "../types";
import { buildOutcomeSummary } from "../types";
import { allstarBundledDataDir } from "../paths";
import { buildCadacoComparison, pearsonCorrelation, surpriseScore } from "./comparison";
import { buildEraAnalysis, decadeFromYear } from "./eras";
import { buildPreservationMilestones } from "./milestones";
import { buildResearchTierState } from "../research-tiers";
import type {
  BinderPage,
  CollectionIntelligence,
  ExplorerEntry,
  ExplorerFilters,
  PlayerIntelligenceProfile,
  PlayerIntelligenceRecord,
  ResearchCardRank,
} from "./types";
import { careerRates, discRatesFromProbabilities } from "./types";

function intelligenceDir(): string {
  return join(allstarBundledDataDir(), "intelligence", "players");
}

async function loadIntelligenceRecords(): Promise<PlayerIntelligenceRecord[]> {
  const dir = intelligenceDir();
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const records: PlayerIntelligenceRecord[] = [];
  for (const file of files) {
    try {
      records.push(JSON.parse(await readFile(join(dir, file), "utf8")) as PlayerIntelligenceRecord);
    } catch {
      /* skip */
    }
  }
  return records;
}

function positionBucket(position: string): string {
  const upper = position.toUpperCase();
  if (upper.includes("PITCH")) return "Pitchers";
  if (upper.includes("CATCH")) return "Catchers";
  if (upper.includes("FIRST")) return "Infielders";
  if (upper.includes("SECOND")) return "Infielders";
  if (upper.includes("THIRD")) return "Infielders";
  if (upper.includes("SHORT")) return "Infielders";
  if (upper.includes("OUTFIELD") || upper.includes("FIELD")) return "Outfielders";
  return "Other";
}

function buildBinderPages(profiles: PlayerIntelligenceProfile[]): BinderPage[] {
  const card = (profile: PlayerIntelligenceProfile) => ({
    discId: profile.record.discId,
    player: profile.record.fullName,
    position: profile.record.position,
    thumbnailUrl: `/api/ops/allstar/image?kind=review&id=${encodeURIComponent(profile.record.discId)}`,
    canonicalFile: profile.archive.canonicalFile ?? null,
  });

  const pages: BinderPage[] = [
    {
      id: "hall-of-famers",
      label: "Hall of Famers",
      description: "Cooperstown discs in the living archive.",
      cards: profiles.filter((p) => p.record.hallOfFame).map(card),
    },
    {
      id: "outfielders",
      label: "Outfielders",
      description: "Left, center, and right field profiles.",
      cards: profiles.filter((p) => positionBucket(p.record.position) === "Outfielders").map(card),
    },
    {
      id: "infielders",
      label: "Infielders",
      description: "Corner and middle infield discs.",
      cards: profiles.filter((p) => positionBucket(p.record.position) === "Infielders").map(card),
    },
    {
      id: "yankees",
      label: "Yankees",
      description: "New York Yankees in the collection.",
      cards: profiles
        .filter((p) => p.record.primaryTeams.some((t) => /yankees/i.test(t)))
        .map(card),
    },
    {
      id: "cardinals",
      label: "Cardinals",
      description: "St. Louis Cardinals discs.",
      cards: profiles
        .filter((p) => p.record.primaryTeams.some((t) => /cardinals/i.test(t)))
        .map(card),
    },
    {
      id: "cubs",
      label: "Cubs",
      description: "Chicago Cubs in the archive.",
      cards: profiles.filter((p) => p.record.primaryTeams.some((t) => /cubs/i.test(t))).map(card),
    },
    {
      id: "braves",
      label: "Braves",
      description: "Boston / Milwaukee / Atlanta Braves lineage.",
      cards: profiles.filter((p) => p.record.primaryTeams.some((t) => /braves/i.test(t))).map(card),
    },
  ];

  return pages.filter((page) => page.cards.length > 0);
}

function buildResearch(profiles: PlayerIntelligenceProfile[]) {
  const ranks: ResearchCardRank[] = profiles.map((profile) => ({
    discId: profile.record.discId,
    player: profile.record.fullName,
    accuracyScore: profile.comparison.accuracyScore,
    surpriseScore: surpriseScore(profile.comparison),
  }));

  const discHr = profiles.map((p) => discRatesFromProbabilities(p.archive.probabilities).hr);
  const actualHr = profiles.map((p) => careerRates(p.record.career).hr);
  const discBb = profiles.map((p) => discRatesFromProbabilities(p.archive.probabilities).bb);
  const actualBb = profiles.map((p) => careerRates(p.record.career).bb);
  const discK = profiles.map((p) => discRatesFromProbabilities(p.archive.probabilities).k);
  const actualK = profiles.map((p) => careerRates(p.record.career).k);

  const allDisc = profiles.flatMap((p) => {
    const d = discRatesFromProbabilities(p.archive.probabilities);
    return [d.hr, d.bb, d.k, d.double, d.triple];
  });
  const allActual = profiles.flatMap((p) => {
    const a = careerRates(p.record.career);
    return [a.hr, a.bb, a.k, a.double, a.triple];
  });

  return {
    correlations: [
      { metric: "Home Run", correlation: pearsonCorrelation(discHr, actualHr), sampleSize: profiles.length },
      { metric: "Walk", correlation: pearsonCorrelation(discBb, actualBb), sampleSize: profiles.length },
      { metric: "Strikeout", correlation: pearsonCorrelation(discK, actualK), sampleSize: profiles.length },
      {
        metric: "Overall",
        correlation: pearsonCorrelation(allDisc, allActual),
        sampleSize: profiles.length,
      },
    ],
    mostAccurate: [...ranks].sort((a, b) => b.accuracyScore - a.accuracyScore).slice(0, 5),
    leastAccurate: [...ranks].sort((a, b) => a.accuracyScore - b.accuracyScore).slice(0, 5),
    mostSurprising: [...ranks].sort((a, b) => b.surpriseScore - a.surpriseScore).slice(0, 5),
  };
}

function buildExplorerEntries(
  snapshot: Awaited<ReturnType<typeof loadAllStarSnapshot>>,
  profiles: PlayerIntelligenceProfile[],
  archiveByDisc: Map<string, AllStarArchiveRecord>,
): ExplorerEntry[] {
  const profileByDisc = new Map(profiles.map((p) => [p.record.discId, p]));

  return snapshot.discs.map((disc) => {
    const profile = profileByDisc.get(disc.id);
    const archive = archiveByDisc.get(disc.id);
    return {
      discId: disc.id,
      player: profile?.record.fullName ?? disc.player,
      position: profile?.record.position ?? disc.position,
      teams: profile?.record.primaryTeams ?? [],
      era: profile?.record.era ?? "modern",
      decade: profile ? decadeFromYear(profile.record.debutYear) : "Unknown",
      hallOfFame: profile?.record.hallOfFame ?? false,
      processed: disc.processingStatus === "processed",
      preservedAt: profile?.archive.preservedAt ?? null,
      accuracyScore: profile?.comparison.accuracyScore ?? null,
      thumbnailUrl: `/api/ops/allstar/image?kind=review&id=${encodeURIComponent(disc.id)}`,
      canonicalFile: archive?.canonicalFile ?? disc.canonicalFile ?? null,
    };
  });
}

export function filterExplorerEntries(
  entries: ExplorerEntry[],
  filters: ExplorerFilters,
): ExplorerEntry[] {
  return entries.filter((entry) => {
    if (filters.position !== "all" && !entry.position.toUpperCase().includes(filters.position.toUpperCase())) {
      return false;
    }
    if (filters.hallOfFame === "hof" && !entry.hallOfFame) return false;
    if (filters.hallOfFame === "non-hof" && entry.hallOfFame) return false;
    if (filters.team !== "all" && !entry.teams.some((t) => t.toUpperCase().includes(filters.team.toUpperCase()))) {
      return false;
    }
    if (filters.era !== "all" && entry.era !== filters.era) return false;
    if (filters.decade !== "all" && entry.decade !== filters.decade) return false;
    if (filters.processed === "processed" && !entry.processed) return false;
    if (filters.processed === "pending" && entry.processed) return false;
    return true;
  });
}

export async function buildCollectionIntelligence(): Promise<CollectionIntelligence> {
  const snapshot = await loadAllStarSnapshot();
  const archiveRecords = await loadArchiveRecords();
  const intelRecords = await loadIntelligenceRecords();

  const archiveByDisc = new Map(archiveRecords.map((r) => [r.id, r]));

  const profiles: PlayerIntelligenceProfile[] = intelRecords
    .map((record) => {
      const archive = archiveByDisc.get(record.discId);
      if (!archive) return null;
      const outcomeSummary = buildOutcomeSummary(archive.degrees, archive.probabilities);
      const comparison = buildCadacoComparison(archive.probabilities, record.career);
      return {
        record,
        archive,
        outcomeSummary,
        comparison,
        decade: decadeFromYear(record.debutYear),
      };
    })
    .filter((profile): profile is PlayerIntelligenceProfile => profile != null);

  const explorerEntries = buildExplorerEntries(snapshot, profiles, archiveByDisc);
  const preservedCount = snapshot.stats.processedScans;

  return {
    updatedAt: new Date().toISOString(),
    profiles,
    eras: buildEraAnalysis(profiles),
    milestones: buildPreservationMilestones(snapshot, profiles),
    research: buildResearch(profiles),
    explorerEntries,
    binderPages: buildBinderPages(profiles),
    preservedCount,
    researchTiers: buildResearchTierState(preservedCount, snapshot.stats.totalScans),
  };
}

export async function loadPlayerIntelligence(discId: string): Promise<PlayerIntelligenceProfile | null> {
  const intelligence = await buildCollectionIntelligence();
  return intelligence.profiles.find((p) => p.record.discId === discId) ?? null;
}
