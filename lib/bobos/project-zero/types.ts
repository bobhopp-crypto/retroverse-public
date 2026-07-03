/** BobOS Project Zero — orchestration shell data types. */

export type WorkspaceStatus = "NOT_STARTED" | "NEEDS_ATTENTION" | "DONE";

export const WORKSPACE_STATUS_LABELS: Record<WorkspaceStatus, string> = {
  NOT_STARTED: "Not Started",
  NEEDS_ATTENTION: "Needs Attention",
  DONE: "Done",
};

/** Fixed, hard-coded catalog for Project Zero — no plugin system. */
export type WorkspaceCatalogId =
  | "passes"
  | "poster"
  | "public-experience"
  | "giveaway"
  | "marketplace-listing"
  | "finance-review"
  | "general";

export type ProjectDomain = "event" | "sale" | "general";

/** The single source of truth every workspace reads from — never duplicated per workspace. */
export type ProjectSharedContext = {
  title: string;
  description: string;
  venue: string;
  date: string;
  /** Event series (e.g. "Retro Sundays") — distinct from the one-off event title. */
  series: string;
  theme: string;
  colors: string;
  notes: string;
};

export type ProjectWorkspace = {
  id: WorkspaceCatalogId;
  title: string;
  status: WorkspaceStatus;
  notes: string;
};

export type Project = {
  id: string;
  title: string;
  objective: string;
  domain: ProjectDomain;
  createdAt: string;
  updatedAt: string;
  sharedContext: ProjectSharedContext;
  workspaces: ProjectWorkspace[];
};

export type ProjectFile = {
  version: 1;
  projects: Project[];
};
