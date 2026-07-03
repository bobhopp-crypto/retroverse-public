export { buildExperiencePatterns } from "./patterns";
export { buildMuseumWall } from "./museum-wall";
export { buildAutoExperienceScorecard, applyOperatorScorecard } from "./scorecard";
export { detectExperienceFingerprints, hashDirectorPlan, openingExhibitPattern } from "./fingerprint";
export {
  buildExperienceVector,
  computeSimilarity,
  findSimilarExperiences,
  uniquenessFromSimilarities,
} from "./similarity";
export {
  promoteToGoldenPackage,
  assertNotGoldenForDirectorRun,
  goldenStatusForRvtr,
} from "./golden";
export { runExperienceDriftCheck, getDriftWarning } from "./drift";
export {
  runExperienceCritic,
  mergeCriticIntoCoachingHints,
  mergeGoldenCriticIntoCoachingHints,
} from "./critic";
export type {
  ExperienceCriticReport,
  ExperienceCriticObservation,
} from "./critic";
export {
  loadExperienceEvolutionStore,
  isGoldenPackage,
  getGoldenPackage,
  listGoldenPackages,
  getLatestDriftReport,
} from "./store";
export type {
  ExperienceFingerprint,
  ExperienceScorecard,
  ExperienceScorecardDimension,
  ExperienceScorecardDimensionId,
  SimilarExperienceMatch,
  ExperiencePatternsSnapshot,
  GoldenPackageRecord,
  ExperienceDriftReport,
  MuseumWallEntry,
} from "./types";
export { EXPERIENCE_FINGERPRINTS, SCORECARD_LABELS } from "./types";
