import type {
  AllStarArchiveRecord,
  AllStarOutcomeSummaryItem,
  WedgeProbabilities,
} from "../types";
import type { ResearchTierState } from "../research-tiers";

export type BaseballEra =
  | "deadBall"
  | "babeRuth"
  | "postWar"
  | "expansion"
  | "modern";

export type PlayerCareerStats = {
  games: number;
  pa: number;
  ab: number;
  hits: number;
  hr: number;
  doubles: number;
  triples: number;
  bb: number;
  so: number;
  war: number;
};

export type PlayerIntelligenceRecord = {
  discId: string;
  fullName: string;
  position: string;
  hallOfFame: boolean;
  hofYear: number | null;
  debutYear: number;
  finalYear: number;
  primaryTeams: string[];
  era: BaseballEra;
  career: PlayerCareerStats;
  notes?: string;
  statsSource?: string;
  accuracyScore?: number;
  accuracyLabel?: string;
  researchProbabilities?: Record<string, number>;
  enrichmentStatus?: "enriched" | "pending";
  enrichmentFailures?: string[];
  generatedAt?: string;
};

export type RateComparison = {
  key: "hr" | "bb" | "k" | "double" | "triple";
  label: string;
  discPct: number;
  actualPct: number;
  delta: number;
};

export type CadacoComparison = {
  rates: RateComparison[];
  accuracyScore: number;
  accuracyLabel: string;
  summary: string;
};

export type PlayerIntelligenceProfile = {
  record: PlayerIntelligenceRecord;
  archive: AllStarArchiveRecord;
  outcomeSummary: AllStarOutcomeSummaryItem[];
  comparison: CadacoComparison;
  decade: string;
};

export type EraBucket = {
  key: BaseballEra;
  label: string;
  range: string;
  playerCount: number;
  avgHomeRun: number;
  avgStrikeout: number;
  avgWalk: number;
};

export type ResearchCorrelation = {
  metric: string;
  correlation: number | null;
  sampleSize: number;
};

export type ResearchCardRank = {
  discId: string;
  player: string;
  accuracyScore: number;
  surpriseScore: number;
};

export type PreservationMilestone = {
  id: string;
  label: string;
  target: number;
  current: number;
  unlocked: boolean;
  description: string;
};

export type ExplorerFilters = {
  position: string;
  hallOfFame: string;
  team: string;
  era: string;
  decade: string;
  processed: string;
};

export type ExplorerEntry = {
  discId: string;
  player: string;
  position: string;
  teams: string[];
  era: BaseballEra;
  decade: string;
  hallOfFame: boolean;
  processed: boolean;
  preservedAt: string | null;
  accuracyScore: number | null;
  thumbnailUrl: string;
  canonicalFile: string | null;
};

export type BinderPage = {
  id: string;
  label: string;
  description: string;
  cards: Array<{
    discId: string;
    player: string;
    position: string;
    thumbnailUrl: string;
    canonicalFile: string | null;
  }>;
};

export type CollectionIntelligence = {
  updatedAt: string;
  profiles: PlayerIntelligenceProfile[];
  eras: EraBucket[];
  milestones: PreservationMilestone[];
  research: {
    correlations: ResearchCorrelation[];
    mostAccurate: ResearchCardRank[];
    leastAccurate: ResearchCardRank[];
    mostSurprising: ResearchCardRank[];
  };
  explorerEntries: ExplorerEntry[];
  binderPages: BinderPage[];
  preservedCount: number;
  researchTiers: ResearchTierState;
};

export type DiscRates = {
  hr: number;
  bb: number;
  k: number;
  double: number;
  triple: number;
};

export function discRatesFromProbabilities(probabilities: WedgeProbabilities): DiscRates {
  return {
    hr: probabilities["1"] ?? 0,
    bb: probabilities["9"] ?? 0,
    k: probabilities["10"] ?? 0,
    double: probabilities["11"] ?? 0,
    triple: probabilities["5"] ?? 0,
  };
}

export function careerRates(career: PlayerCareerStats): DiscRates {
  const pa = Math.max(career.pa, 1);
  return {
    hr: career.hr / pa,
    bb: career.bb / pa,
    k: career.so / pa,
    double: career.doubles / pa,
    triple: career.triples / pa,
  };
}
