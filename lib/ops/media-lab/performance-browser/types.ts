import type { MsExportGrouping } from "@/lib/ops/media-collections/midnight-special/export-metadata";
import type { PerformanceStatus } from "@/lib/ops/media-collections/midnight-special/types";

export type PerformanceBrowserCollection = {
  id: string;
  slug: string;
  title: string;
  enabled: boolean;
  performance_count?: number;
};

export type PerformanceBrowserRow = {
  collection_id: string;
  collection_slug: string;
  collection_title: string;
  episode_id: string;
  episode_title: string;
  performance_id: string;
  artist: string;
  title: string;
  year: number | null;
  air_date?: string;
  status: PerformanceStatus;
  classification: MsExportGrouping | "Unknown";
  detected_start: number;
  detected_end: number;
  effective_start: number;
  effective_end: number;
  adjusted_start?: number;
  adjusted_end?: number;
  clip_review_href: string;
};

export type PerformanceBrowserQuery = {
  q?: string;
  collection?: string;
  year?: number;
  status?: PerformanceStatus | "all";
  classification?: MsExportGrouping | "Unknown" | "all";
  limit?: number;
};

export type PerformanceBrowserResult = {
  collections: PerformanceBrowserCollection[];
  total: number;
  filtered: number;
  rows: PerformanceBrowserRow[];
  facets: {
    years: number[];
    statuses: PerformanceStatus[];
    classifications: string[];
  };
};
