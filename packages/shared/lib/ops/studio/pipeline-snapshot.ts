import "server-only";

import { loadCollectorProgress } from "@/lib/ops/studio/collector/store";
import { buildDepartmentQueueIndex } from "@/lib/ops/studio/department-status/queue-index";
import type {
  DepartmentPipelineCounts,
  PipelineHealthSnapshot,
} from "@/lib/ops/studio/pipeline-snapshot-types";

export type { DepartmentPipelineCounts, PipelineHealthSnapshot } from "@/lib/ops/studio/pipeline-snapshot-types";

export async function buildPipelineHealthSnapshot(): Promise<PipelineHealthSnapshot> {
  const [queueIndex, collectorProgress] = await Promise.all([
    buildDepartmentQueueIndex(),
    loadCollectorProgress().catch(() => null),
  ]);

  const collectorRunning = collectorProgress?.status === "researching" ? 1 : 0;

  const collector: DepartmentPipelineCounts = {
    running: collectorRunning,
    waiting: queueIndex.collector.waiting,
    complete: queueIndex.collector.complete,
    idle: !collectorRunning,
    queued: queueIndex.collector.waiting,
    failed: 0,
  };

  const editor: DepartmentPipelineCounts = {
    running: 0,
    waiting: queueIndex.editor.waiting,
    complete: queueIndex.editor.complete,
    idle: true,
    queued: queueIndex.editor.waiting,
    failed: 0,
  };

  const director: DepartmentPipelineCounts = {
    running: 0,
    waiting: queueIndex.director.waiting,
    complete: queueIndex.director.complete,
    idle: true,
    queued: queueIndex.director.waiting,
    failed: queueIndex.director.waiting,
  };

  const publisher: DepartmentPipelineCounts = {
    running: 0,
    waiting: queueIndex.publisher.waiting,
    complete: queueIndex.publisher.complete,
    idle: true,
    queued: Math.max(0, queueIndex.publisher.evaluated - queueIndex.publisher.approved),
    evaluated: queueIndex.publisher.evaluated,
    approved: queueIndex.publisher.approved,
    failed: Math.max(0, queueIndex.director.complete - queueIndex.publisher.evaluated),
  };

  return {
    generatedAt: queueIndex.generatedAt,
    totalVideoRows: queueIndex.totalVideoRows,
    publishedTotal: queueIndex.publishedTotal,
    collector,
    editor,
    director,
    publisher,
    stuckEditorReadyNotSubmitted: queueIndex.editor.waiting,
    stuckEditorSubmittedNoDirector: queueIndex.director.waiting,
    stuckDirectorNoPublisher: Math.max(
      0,
      queueIndex.director.complete - queueIndex.publisher.evaluated,
    ),
    exceptions: [],
  };
}

export function formatPipelineHealthSnapshot(snapshot: PipelineHealthSnapshot): string {
  const dept = (name: string, c: DepartmentPipelineCounts) =>
    [
      `**${name}**`,
      `Running: ${c.running}`,
      `Waiting: ${c.waiting}`,
      `Complete: ${c.complete}`,
    ].join("\n  ");

  return [
    `# Studio Pipeline Health`,
    ``,
    `Generated: ${snapshot.generatedAt}`,
    `Video library rows: ${snapshot.totalVideoRows}`,
    ``,
    dept("Collector", snapshot.collector),
    ``,
    dept("Editor", snapshot.editor),
    ``,
    dept("Director", snapshot.director),
    ``,
    dept("Publisher", snapshot.publisher),
    ``,
    `**Published**`,
    `  Total: ${snapshot.publishedTotal}`,
    ``,
    `## Stuck points`,
    `- Editor complete, not handed to Director: **${snapshot.stuckEditorReadyNotSubmitted}**`,
    `- Editor submitted, Director not started: **${snapshot.stuckEditorSubmittedNoDirector}**`,
    `- Director complete, Publisher not evaluated: **${snapshot.stuckDirectorNoPublisher}**`,
    snapshot.exceptions.length
      ? `\n## Exceptions\n${snapshot.exceptions.map((e) => `- ${e}`).join("\n")}`
      : "",
  ].join("\n");
}
