import type { YearWorkspaceCategoryId } from "../types";

export type SourceType = "youtube" | "internet_archive";

export type SourceCandidateStatus =
  | "pending"
  | "reviewed"
  | "selected"
  | "rejected";

export type SourceCandidate = {
  id: string;
  recommendationId: string;
  title: string;
  sourceType: SourceType;
  query: string;
  url: string;
  status: SourceCandidateStatus;
  createdAt: string;
  updatedAt: string;
};

export type CategorySourcesFile = {
  version: 1;
  year: number;
  category: YearWorkspaceCategoryId;
  byRecommendation: Record<string, SourceCandidate[]>;
  updatedAt: string;
};

export type SourceDiscoveryDrawerPayload = {
  recommendationId: string;
  recommendationTitle: string;
  youtube: SourceCandidate[];
  internetArchive: SourceCandidate[];
};
