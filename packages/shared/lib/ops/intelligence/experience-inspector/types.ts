/**
 * RV04-03 Experience Inspector — Phase 0 inventory types.
 * Read-only diagnostic shapes only. No mutation APIs.
 */

export type InventorySectionStatus =
  | "available"
  | "missing"
  | "empty"
  | "error"
  | "not-applicable";

export type ExperienceInventorySource = {
  subsystem: string;
  loader?: string;
  path?: string;
};

export type ExperienceInventorySection<T = unknown> = {
  id: string;
  label: string;
  status: InventorySectionStatus;
  source: ExperienceInventorySource;
  summary?: string;
  count?: number;
  data?: T;
  error?: string;
};

export type ExperienceInventoryResolutionMethod = "rvtr" | "virtualdj-rvtr";

export type ExperienceInventory = {
  rvtr: string;
  inspectedAt: string;
  identity: {
    title?: string;
    artist?: string;
    album?: string;
    year?: number | string;
    artworkUrl?: string;
  };
  resolution: {
    requestedIdentifier: string;
    resolvedRvtr: string;
    method: ExperienceInventoryResolutionMethod;
  };
  totals: {
    available: number;
    missing: number;
    empty: number;
    errors: number;
    notApplicable: number;
  };
  sections: ExperienceInventorySection[];
};

export type ExperienceInventoryRequest = {
  /** Direct RVTR, or empty when resolving from a VirtualDJ Label-attached RVTR. */
  rvtr?: string | null;
  /**
   * VirtualDJ FilePath whose Label already contains an authoritative RVTR.
   * No title/artist guessing — Label RVTR only.
   */
  vdjFilePath?: string | null;
  /** When set, force that section id into status "error" (verification only). */
  debugFailSection?: string | null;
};

export type VdjRvtrLinkedEntry = {
  rvtr: string;
  filePath: string;
  artist: string;
  title: string;
  album: string;
  year: number | null;
  playCount: number | null;
  label: string;
  user2: string;
  isVideo: boolean;
};
