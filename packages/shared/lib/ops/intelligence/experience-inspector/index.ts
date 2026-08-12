/**
 * RV04-03 Experience Inspector — public read-only entrypoints.
 * Do not import write-oriented actions through this barrel.
 */

export type {
  ExperienceInventory,
  ExperienceInventoryRequest,
  ExperienceInventorySection,
  ExperienceInventorySource,
  InventorySectionStatus,
  VdjRvtrLinkedEntry,
} from "./types";

export {
  readExperienceInventory,
  resolveInventoryIdentity,
} from "./read-experience-inventory";

export {
  findVdjEntryByRvtr,
  listVdjRvtrLinkedEntries,
  resolveRvtrFromVdjFilePath,
  rvtrFromVdjLabel,
} from "./vdj-rvtr-entries";

export {
  assertPresentationCoverage,
  groupInventorySections,
  INVENTORY_PRESENTATION_CATEGORIES,
  KNOWN_INVENTORY_SECTION_IDS,
} from "./presentation-categories";

export type {
  InventoryPresentationCategoryId,
  PresentationCategoryView,
} from "./presentation-categories";

export {
  buildOperatorWorkspace,
  deriveExperienceHealth,
  deriveRecommendedActions,
  deriveSongWorkspaceBadges,
  FUTURE_TOOLS,
} from "./operator-workspace";

export type {
  ExperienceHealthStatement,
  HealthTone,
  OperatorWorkspaceModel,
  RecommendedAction,
  SongWorkspaceBadges,
} from "./operator-workspace";

export {
  buildPublicNavLinks,
  derivePublicStatus,
} from "./public-status";

export type {
  PublicNavLink,
  PublicNavModel,
  PublicStatusFlag,
} from "./public-status";
