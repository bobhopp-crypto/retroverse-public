/** Restoration pattern discovery — serializable types for ops healing UI. */

export type RestorationFamilyId =
  | "duplicate_ingest_family"
  | "vdj_only_overlay"
  | "cover_critical_chart_gap"
  | "compilation_poisoned"
  | "anthology_weak_join"
  | "soundtrack_candidate_trap"
  | "early_era_orphan_single"
  | "high_confidence_studio_match"
  | "ambiguous_multi_candidate"
  | "general_degraded";

export type RestorationFamilyExample = {
  rvtr: string;
  title: string;
  artistName: string;
};

export type RestorationFamilyFinding = {
  id: RestorationFamilyId;
  name: string;
  approximateCount: number | null;
  countSource: "corpus" | "queue_sample";
  strategy: string;
  examples: RestorationFamilyExample[];
};

export type RowRestorationFamily = {
  id: RestorationFamilyId;
  name: string;
  guidance: string;
  strategy: string;
};

export type SafeFixPatternFinding = {
  pattern: string;
  reliability: "high" | "medium" | "observed";
  confidenceRange: string;
  note: string;
  sampleCount: number;
};

export type DangerousPatternFinding = {
  pattern: string;
  whyDangerous: string;
  falsePositiveBehavior: string;
  sampleCount: number;
};

export type EraRestorationObservation = {
  era: string;
  observation: string;
  restorationCharacter: string;
};

export type ConfidenceReliabilityBand = {
  band: string;
  matchConfidence: string;
  curatorTrust: string;
  observation: string;
};

export type ConfidenceReliabilityFinding = {
  summary: string;
  bands: ConfidenceReliabilityBand[];
  rollbackNote: string;
  uncertaintyNote: string;
};

export type HealingRestorationPatterns = {
  generatedAt: string;
  families: RestorationFamilyFinding[];
  safeFixPatterns: SafeFixPatternFinding[];
  dangerousPatterns: DangerousPatternFinding[];
  eraObservations: EraRestorationObservation[];
  confidenceReliability: ConfidenceReliabilityFinding;
  byRvtr: Record<string, RowRestorationFamily>;
};
