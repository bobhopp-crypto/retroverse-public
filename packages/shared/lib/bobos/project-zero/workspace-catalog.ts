import type { WorkspaceCatalogId } from "./types";

export type WorkspaceCatalogEntry = {
  id: WorkspaceCatalogId;
  title: string;
  /**
   * When set, "Open" launches this already-working capability page directly —
   * reused as-is, untouched. When null, Project Zero renders its own workspace
   * shell for this id (either a real BobOS-owned workspace, or — if none exists
   * yet — the generic placeholder).
   */
  existingHref: string | null;
};

export const WORKSPACE_CATALOG: Record<WorkspaceCatalogId, WorkspaceCatalogEntry> = {
  passes: {
    id: "passes",
    title: "Passes",
    // BobOS owns this workspace now — it already knows the event, so it renders
    // its own context-aware Pass Workspace instead of linking to the old wizard.
    existingHref: null,
  },
  poster: {
    id: "poster",
    title: "Poster",
    existingHref: null,
  },
  "public-experience": {
    id: "public-experience",
    title: "Public Experience",
    existingHref: "/ops/event-studio/homepage",
  },
  giveaway: {
    id: "giveaway",
    title: "Giveaway",
    existingHref: "/ops/event-studio/giveaway",
  },
  "marketplace-listing": {
    id: "marketplace-listing",
    title: "Marketplace Listing",
    existingHref: null,
  },
  "finance-review": {
    id: "finance-review",
    title: "Finance Review",
    existingHref: "/ops/finance",
  },
  general: {
    id: "general",
    title: "General Workspace",
    existingHref: null,
  },
};
