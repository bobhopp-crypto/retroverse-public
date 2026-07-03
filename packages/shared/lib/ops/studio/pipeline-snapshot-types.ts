/** Shared pipeline health types (safe for client + server). */

export type DepartmentPipelineCounts = {
  running: number;
  waiting: number;
  complete: number;
  idle?: boolean;
  queued?: number;
  evaluated?: number;
  approved?: number;
  failed?: number;
};

export type PipelineHealthSnapshot = {
  generatedAt: string;
  totalVideoRows: number;
  publishedTotal: number;
  collector: DepartmentPipelineCounts;
  editor: DepartmentPipelineCounts;
  director: DepartmentPipelineCounts;
  publisher: DepartmentPipelineCounts;
  stuckEditorReadyNotSubmitted: number;
  stuckEditorSubmittedNoDirector: number;
  stuckDirectorNoPublisher: number;
  exceptions: string[];
};

export function emptyPipelineHealthSnapshot(): PipelineHealthSnapshot {
  const emptyDept = (): DepartmentPipelineCounts => ({
    running: 0,
    waiting: 0,
    complete: 0,
  });
  return {
    generatedAt: new Date().toISOString(),
    totalVideoRows: 0,
    publishedTotal: 0,
    collector: emptyDept(),
    editor: emptyDept(),
    director: emptyDept(),
    publisher: emptyDept(),
    stuckEditorReadyNotSubmitted: 0,
    stuckEditorSubmittedNoDirector: 0,
    stuckDirectorNoPublisher: 0,
    exceptions: [],
  };
}
