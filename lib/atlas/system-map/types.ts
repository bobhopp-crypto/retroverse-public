import type { NpmScriptEntry } from "@/lib/atlas/npm-script-catalog";

export type RouteCategory =
  | "Public"
  | "Live"
  | "Studio"
  | "Atlas"
  | "Ops"
  | "API"
  | "Admin";

export type RouteStatus = "Active" | "Legacy" | "Experimental" | "Unknown";

export type SystemRoute = {
  url: string;
  title: string;
  category: RouteCategory;
  status: RouteStatus;
  filePath: string;
};

export type SystemApiEndpoint = {
  endpoint: string;
  methods: string[];
  purpose: string;
  referencedBy: string[];
  filePath: string;
};

export type SystemDataSource = {
  id: string;
  path: string;
  purpose: string;
  sizeLabel: string;
  sizeBytes: number;
  lastModified: string;
  exists: boolean;
};

export type SystemWorker = {
  name: string;
  entryPoint: string;
  startedByScript: string;
  purpose: string;
};

export type SystemReportGroup = {
  folder: string;
  reports: Array<{
    name: string;
    relativePath: string;
    lastModified: string;
    kind: "file" | "folder";
  }>;
};

export type SystemPipeline = {
  id: string;
  title: string;
  steps: string[];
};

export type SystemMapHealth = {
  routes: number;
  apiEndpoints: number;
  scripts: number;
  workers: number;
  reports: number;
  dataSources: number;
};

export type SystemMap = {
  generatedAt: string;
  cached: boolean;
  health: SystemMapHealth;
  routes: SystemRoute[];
  apis: SystemApiEndpoint[];
  scriptSummary: {
    total: number;
    byCategory: Record<string, number>;
    launcherHref: string;
  };
  pipelines: SystemPipeline[];
  dataSources: SystemDataSource[];
  environmentVariables: string[];
  workers: SystemWorker[];
  reportGroups: SystemReportGroup[];
};

export type SystemMapCachePayload = SystemMap & {
  cacheVersion: 1;
};

export type { NpmScriptEntry };
