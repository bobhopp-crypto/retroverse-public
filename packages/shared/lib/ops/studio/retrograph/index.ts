/**
 * Retrograph — public Studio module barrel.
 * The Retrograph is the single authoritative internal knowledge model per entity.
 */

export { RETROGRAPH_VERSION } from "./types";
export type {
  Retrograph,
  RetrographAiEnrichment,
  RetrographCharts,
  RetrographConflictReport,
  RetrographDedupeReport,
  RetrographEntityKind,
  RetrographFact,
  RetrographFactCounts,
  RetrographFactStatus,
  RetrographMediaImage,
  RetrographMediaVideo,
  RetrographPersonnel,
  RetrographRecording,
  RetrographRelationshipEdge,
  RetrographSourceRef,
  RetrographTimelineEvent,
  RetroverseDossier,
  DossierFact,
} from "./types";

export { isInvalidCollectorFact, normalizeFactText } from "./fact-guards";
export {
  buildRetrographFromCollector,
  usableRetrographFacts,
  buildDossierFromCollector,
  usableDossierFacts,
} from "./build-retrograph";
export { buildRetrographRelationships } from "./relationships";
export {
  isLegacyDossierPayload,
  migrateLegacyDossierToRetrograph,
  retrographLegacyFlatView,
} from "./migrate-legacy-dossier";
export { loadRetrograph, saveRetrograph, loadDossier, saveDossier } from "./store";
