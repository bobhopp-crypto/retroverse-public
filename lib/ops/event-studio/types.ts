export type EventStudioSection =
  | "overview"
  | "identity"
  | "assets"
  | "create"
  | "publish"
  | "audience"
  | "archive"
  | "settings";

export type EventStudioStatus = "Planning" | "Live" | "Archived";

export type EventStudioSnapshot = {
  eventName: string;
  venue: string;
  date: string;
  theme: string;
  featuredYears: number[];
  status: EventStudioStatus;
  updatedAt: string;
};

export type EventStudioIdentity = {
  eventName: string;
  venue: string;
  date: string;
  theme: string;
  featuredYears: number[];
  styleProfile: string;
  colorPaletteLabel: string;
  colorSwatches: string[];
  fonts: string;
  aiPromptProfile: string;
};

export type ProductionChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export type ProductionProgress = {
  done: number;
  total: number;
  percent: number;
};

export type ProductionAssetSlot = {
  id: string;
  label: string;
  thumbnailUrl?: string;
  status: "approved" | "draft" | "missing";
};

export type ProductionBinder = {
  snapshot: EventStudioSnapshot;
  identity: EventStudioIdentity;
  checklist: ProductionChecklistItem[];
  progress: ProductionProgress;
  assets: ProductionAssetSlot[];
};

export type EventStudioNavItem = {
  id: EventStudioSection;
  label: string;
  href: string;
};

export type EventStudioCreateTool = {
  id: string;
  title: string;
  description: string;
  href?: string;
  status: "active" | "planned";
};

export type EventStudioWorkflowItem = {
  id: string;
  title: string;
  description: string;
  href?: string;
};

export type EventStudioArchiveEntry = {
  id: string;
  name: string;
  status: "current" | "past" | "planned";
};
