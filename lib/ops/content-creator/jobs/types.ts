export type ContentCreatorJobStatus = "queued" | "running" | "completed" | "failed";

export type ContentCreatorJobType = "generate" | "variations";

export type ContentCreatorJobProgress = {
  current: number;
  total: number;
  step: string;
};

import type { ProviderErrorDetail } from "@/lib/ops/creative-lab/artwork/provider-error";

export type ContentCreatorJobResult = {
  runId?: string;
  runIds?: string[];
  generationIds?: string[];
  batchId?: string;
  frontUrl?: string;
  backUrl?: string;
};

export type ContentCreatorJob = {
  id: string;
  type: ContentCreatorJobType;
  status: ContentCreatorJobStatus;
  title: string;
  thumbnailPath: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  progress: ContentCreatorJobProgress;
  error: string | null;
  errorDetail: ProviderErrorDetail | null;
  result: ContentCreatorJobResult | null;
  payload: Record<string, unknown>;
};

export type ContentCreatorJobIndex = {
  version: 1;
  updatedAt: string;
  jobs: string[];
};
