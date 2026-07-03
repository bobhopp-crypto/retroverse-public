/** BobOS Cockpit — panel grid state types. */

export type CockpitWorkspaceId =
  | "cockpit"
  | "live-aid-1985"
  | "development"
  | "ai-workbench"
  | "marketplace"
  | "finance"
  | "manufacturing"
  | "research";

export type PanelTypeId =
  | "current-event"
  | "todays-tasks"
  | "current-sprint"
  | "alerts"
  | "next-action"
  | "pass-production"
  | "event-studio"
  | "poster-builder"
  | "print-queue"
  | "documentary-progress"
  | "production-queue"
  | "current-song"
  | "song-packages"
  | "artist-package"
  | "media-library"
  | "collectibles"
  | "years"
  | "virtualdj-status"
  | "ai-queue"
  | "terminal"
  | "git-status"
  | "system-health"
  | "storage"
  | "database-health"
  | "clock"
  | "notes"
  | "printer-panel"
  | "public-homepage"
  | "pass-registration"
  | "giveaway-panel"
  | "live-display"
  | "broadcast";

export type PanelGroup = "attention" | "build" | "catalog" | "devices";

export type PanelStatus = "nominal" | "warning" | "alert" | "offline";

export type PanelAction = {
  label: string;
  href: string;
};

export type PanelDefinition = {
  id: PanelTypeId;
  title: string;
  group: PanelGroup;
  defaultStatus: PanelStatus;
  summary: string;
  primaryAction: PanelAction | null;
  secondaryActions?: PanelAction[];
};

export type CockpitCell = {
  panelType: PanelTypeId | null;
  config?: Record<string, string>;
};

export type CockpitWorkspaceLayout = {
  cells: CockpitCell[];
};

export type CockpitState = {
  version: 1;
  activeWorkspace: CockpitWorkspaceId;
  workspaces: Record<CockpitWorkspaceId, CockpitWorkspaceLayout>;
};

export const COCKPIT_GRID_SIZE = 16;

export const COCKPIT_WORKSPACES: { id: CockpitWorkspaceId; label: string }[] = [
  { id: "cockpit", label: "Cockpit" },
  { id: "live-aid-1985", label: "Live Aid 1985" },
  { id: "development", label: "Development" },
  { id: "ai-workbench", label: "AI Workbench" },
  { id: "marketplace", label: "Marketplace" },
  { id: "finance", label: "Finance" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "research", label: "Research" },
];

export const PANEL_GROUP_LABELS: Record<PanelGroup, string> = {
  attention: "A — Attention",
  build: "B — Build / Production",
  catalog: "C — Catalog / Content",
  devices: "D — Devices / Data / Diagnostics",
};
