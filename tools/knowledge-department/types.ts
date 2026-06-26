/** Knowledge Department bootstrap — shared types. */

export type Confidence = "high" | "medium" | "low";

export type MarkdownRecord = {
  id: string;
  title: string;
  relativePath: string;
  createdAt: string | null;
  modifiedAt: string | null;
  summary: string;
  primaryProject: string;
  majorTopics: string[];
  importantDecisions: string[];
  openQuestions: string[];
  referencedFiles: string[];
  relatedMarkdown: string[];
  confidence: Confidence;
  gitFirstCommit: string | null;
  gitLastCommit: string | null;
  enrichedByOllama: boolean;
  wordCount: number;
  skippedReason?: string;
};

export type MarkdownIndex = {
  generatedAt: string;
  schemaVersion: 1;
  totalFiles: number;
  processedFiles: number;
  ollamaEnriched: number;
  skippedFiles: string[];
  records: MarkdownRecord[];
};

export type ProgressState = {
  startedAt: string;
  updatedAt: string;
  phase: "discover" | "index" | "ollama" | "timeline" | "graph" | "summary" | "complete";
  discoveredPaths: string[];
  indexedPaths: string[];
  ollamaEnrichedPaths: string[];
  skippedPaths: { path: string; reason: string }[];
  errors: { path: string; error: string; at: string }[];
};

export type KnowledgeNode = {
  id: string;
  type: "project" | "system" | "department" | "concept" | "file" | "person";
  label: string;
  mentions: number;
  sourcePaths: string[];
};

export type KnowledgeEdge = {
  from: string;
  to: string;
  relation: string;
  weight: number;
  evidence: string[];
};

export type KnowledgeGraph = {
  generatedAt: string;
  schemaVersion: 1;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
};

export type TimelineEvent = {
  date: string;
  dateSource: "git" | "filename" | "content" | "filesystem";
  confidence: Confidence;
  title: string;
  description: string;
  project: string;
  evidencePaths: string[];
};

export type OllamaEnrichment = {
  summary: string;
  majorTopics: string[];
  importantDecisions: string[];
  openQuestions: string[];
  confidence: Confidence;
};
