/**
 * RV04-03 Phase 1 — presentation-only category mapping.
 * Does not alter loader identities or inventory section keys.
 */

import type {
  ExperienceInventorySection,
  InventorySectionStatus,
} from "./types";

export type InventoryPresentationCategoryId =
  | "identity-catalog"
  | "public-experience"
  | "media-visuals"
  | "broadcast-packages"
  | "pipeline-production"
  | "research-intelligence"
  | "diagnostics";

export type InventoryPresentationCategoryDef = {
  id: InventoryPresentationCategoryId;
  title: string;
  blurb: string;
  /** Explicit section ids owned by this category (presentation-only). */
  sectionIds: readonly string[];
};

/**
 * Every Phase 0 inventory section id known at build time.
 * Keep in sync with `buildSectionDefs` in read-experience-inventory.ts.
 */
export const KNOWN_INVENTORY_SECTION_IDS = [
  "canonical-song",
  "artist",
  "album",
  "year",
  "database-identifiers",
  "database-relationships",
  "alternate-identifiers",
  "canonical-artwork",
  "public-song-payload",
  "story",
  "timeline",
  "trivia",
  "quotes",
  "related-songs",
  "chart-journey",
  "song-package",
  "universal-package",
  "bundled-package-file",
  "public-exhibit",
  "public-experience",
  "public-experience-ops-preview",
  "virtualdj-record",
  "virtualdj-file-path",
  "virtualdj-play-count",
  "virtualdj-tags-metadata",
  "virtualdj-attached-rvtr",
  "virtualdj-video-karaoke",
  "bundled-vdj-index",
  "retroverse-tags",
  "media-library",
  "local-videos",
  "youtube-references",
  "hero-artwork",
  "derived-visuals",
  "visual-identity",
  "visual-library",
  "visual-production",
  "browser-plus-thumbnail",
  "now-playing-package",
  "publisher-record",
  "artifact-readiness",
  "batch-pipeline-status",
  "collector-package",
  "song-dna",
  "retrograph",
  "editor-story",
  "director-handoff",
  "director-package",
  "studio-stage",
  "production-tracker",
  "creative-review",
  "director-pilot",
  "candidate-stories",
  "research-vault",
] as const;

export const INVENTORY_PRESENTATION_CATEGORIES: readonly InventoryPresentationCategoryDef[] = [
  {
    id: "identity-catalog",
    title: "Identity & Catalog",
    blurb: "Canonical song, artist, album, year, database IDs, VirtualDJ Label, and tags",
    sectionIds: [
      "canonical-song",
      "artist",
      "album",
      "year",
      "database-identifiers",
      "database-relationships",
      "alternate-identifiers",
      "canonical-artwork",
      "virtualdj-record",
      "virtualdj-file-path",
      "virtualdj-play-count",
      "virtualdj-tags-metadata",
      "virtualdj-attached-rvtr",
      "virtualdj-video-karaoke",
      "bundled-vdj-index",
      "retroverse-tags",
    ],
  },
  {
    id: "public-experience",
    title: "Public Experience",
    blurb: "Story, timeline, trivia, quotes, chart journey, and public packages",
    sectionIds: [
      "public-song-payload",
      "story",
      "timeline",
      "trivia",
      "quotes",
      "related-songs",
      "chart-journey",
      "song-package",
      "universal-package",
      "bundled-package-file",
      "public-exhibit",
      "public-experience",
      "public-experience-ops-preview",
    ],
  },
  {
    id: "media-visuals",
    title: "Media & Visuals",
    blurb: "Media library, local video, artwork, thumbnails, and visual packages",
    sectionIds: [
      "media-library",
      "local-videos",
      "youtube-references",
      "hero-artwork",
      "derived-visuals",
      "visual-identity",
      "visual-library",
      "visual-production",
      "browser-plus-thumbnail",
    ],
  },
  {
    id: "broadcast-packages",
    title: "Broadcast & Packages",
    blurb: "Now-playing package, publisher gate, and artifact readiness",
    sectionIds: ["now-playing-package", "publisher-record", "artifact-readiness"],
  },
  {
    id: "pipeline-production",
    title: "Pipeline & Production",
    blurb: "Collector, editor, director, studio stage, and production tracker",
    sectionIds: [
      "batch-pipeline-status",
      "collector-package",
      "song-dna",
      "retrograph",
      "editor-story",
      "director-handoff",
      "director-package",
      "studio-stage",
      "production-tracker",
      "creative-review",
    ],
  },
  {
    id: "research-intelligence",
    title: "Research & Intelligence",
    blurb: "Director pilot drafts, candidate stories, and research vault",
    sectionIds: ["director-pilot", "candidate-stories", "research-vault"],
  },
  {
    id: "diagnostics",
    title: "Diagnostics & Raw Data",
    blurb: "Preload failures and uncategorized inventory sections",
    sectionIds: [],
  },
] as const;

const ASSIGNED = new Map<string, InventoryPresentationCategoryId>();

for (const category of INVENTORY_PRESENTATION_CATEGORIES) {
  if (category.id === "diagnostics") continue;
  for (const sectionId of category.sectionIds) {
    if (ASSIGNED.has(sectionId)) {
      throw new Error(
        `Experience Inspector presentation mapping duplicates section "${sectionId}"`,
      );
    }
    ASSIGNED.set(sectionId, category.id);
  }
}

for (const sectionId of KNOWN_INVENTORY_SECTION_IDS) {
  if (!ASSIGNED.has(sectionId)) {
    throw new Error(
      `Experience Inspector presentation mapping missing known section "${sectionId}"`,
    );
  }
}

export type PresentationCategoryView = {
  id: InventoryPresentationCategoryId;
  title: string;
  blurb: string;
  sections: ExperienceInventorySection[];
  totals: {
    available: number;
    missing: number;
    empty: number;
    errors: number;
    notApplicable: number;
    total: number;
  };
  /** Highest-severity status present in the category. */
  overallStatus: InventorySectionStatus | "mixed";
};

function countStatuses(sections: ExperienceInventorySection[]) {
  return {
    available: sections.filter((s) => s.status === "available").length,
    missing: sections.filter((s) => s.status === "missing").length,
    empty: sections.filter((s) => s.status === "empty").length,
    errors: sections.filter((s) => s.status === "error").length,
    notApplicable: sections.filter((s) => s.status === "not-applicable").length,
    total: sections.length,
  };
}

function overallStatus(
  sections: ExperienceInventorySection[],
): InventorySectionStatus | "mixed" {
  if (sections.length === 0) return "missing";
  const statuses = new Set(sections.map((s) => s.status));
  if (statuses.size === 1) return sections[0]!.status;
  if (statuses.has("error")) return "error";
  if (statuses.has("missing") && statuses.has("available")) return "mixed";
  if (statuses.has("empty") && statuses.has("available")) return "mixed";
  if (statuses.has("missing")) return "missing";
  if (statuses.has("empty")) return "empty";
  return "mixed";
}

export function categoryIdForSection(sectionId: string): InventoryPresentationCategoryId {
  return ASSIGNED.get(sectionId) ?? "diagnostics";
}

/** Group inventory sections into presentation categories (each section once). */
export function groupInventorySections(
  sections: ExperienceInventorySection[],
): PresentationCategoryView[] {
  const buckets = new Map<InventoryPresentationCategoryId, ExperienceInventorySection[]>();
  for (const category of INVENTORY_PRESENTATION_CATEGORIES) {
    buckets.set(category.id, []);
  }

  for (const section of sections) {
    const categoryId = categoryIdForSection(section.id);
    buckets.get(categoryId)!.push(section);
  }

  return INVENTORY_PRESENTATION_CATEGORIES.map((category) => {
    const grouped = buckets.get(category.id) ?? [];
    return {
      id: category.id,
      title: category.title,
      blurb: category.blurb,
      sections: grouped,
      totals: countStatuses(grouped),
      overallStatus: overallStatus(grouped),
    };
  }).filter((category) => category.sections.length > 0 || category.id !== "diagnostics");
}

/**
 * Development assertion: every provided section id maps to exactly one category,
 * and every known Phase 0 section id is assigned in the static map.
 */
export function assertPresentationCoverage(sectionIds: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of sectionIds) {
    if (seen.has(id)) {
      throw new Error(`Duplicate inventory section id in result: ${id}`);
    }
    seen.add(id);
    // Accessing the mapper proves unknown ids fall into diagnostics.
    void categoryIdForSection(id);
  }

  for (const known of KNOWN_INVENTORY_SECTION_IDS) {
    if (!ASSIGNED.has(known)) {
      throw new Error(`Known section unassigned: ${known}`);
    }
  }

  const assignedCount = ASSIGNED.size;
  if (assignedCount !== KNOWN_INVENTORY_SECTION_IDS.length) {
    throw new Error(
      `Presentation mapping size mismatch: assigned=${assignedCount} known=${KNOWN_INVENTORY_SECTION_IDS.length}`,
    );
  }
}

/** Run static coverage check once at module evaluation. */
assertPresentationCoverage(KNOWN_INVENTORY_SECTION_IDS);
