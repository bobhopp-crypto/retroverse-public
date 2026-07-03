import type { SourceType } from "./source-discovery/types";
import type { YearWorkspaceCategoryId } from "./types";

export type ProductionSection = "wanted" | "queued" | "acquired" | "approved";

export type ProductionItemKind = "recommendation" | "asset" | "queue_entry";

export type ProductionWorkflowAction = "acquire" | "skip" | "approve";

export type ProductionItem = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  year: number | null;
  sourceCategory: string | null;
  priority: number | null;
  /** Workflow status — kept in sync with section for recommendations. */
  status: ProductionSection;
  kind: ProductionItemKind;
  section: ProductionSection;
  recommendationId: string | null;
  selectedSourceId: string | null;
  sourceUrl: string | null;
  sourceType: SourceType | null;
  attachedFilename: string | null;
  attachedFilepath: string | null;
  attachedAt: string | null;
  workflowAction: ProductionWorkflowAction | null;
  skipped: boolean;
  filename: string | null;
  dateAdded: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryProductionFile = {
  version: 1;
  year: number;
  category: YearWorkspaceCategoryId;
  items: ProductionItem[];
  updatedAt: string;
};

export type CategorySectionCounts = {
  wanted: number;
  queued: number;
  acquired: number;
  approved: number;
};

export type ShowReadinessSummary = {
  year: number;
  targetAssets: number;
  approvedAssets: number;
  percent: number;
};

export type YearWorkspaceProductionSummary = Record<
  YearWorkspaceCategoryId,
  CategorySectionCounts
>;

export type YearWorkspaceProductionState = Record<
  YearWorkspaceCategoryId,
  CategoryProductionFile
>;

export type YearWorkspaceProductionBundle = {
  production: YearWorkspaceProductionState;
  summary: YearWorkspaceProductionSummary;
  showReadiness: ShowReadinessSummary;
};
