import "server-only";

import { loadCollectorPackage, loadCollectorProgress } from "@/lib/ops/studio/collector/store";
import { loadPipelineEvents } from "@/lib/ops/studio/department-status/pipeline-events";
import { loadRuntimeProgressStore } from "@/lib/ops/studio/department-status/runtime-progress";
import type { StudioPipelineEvent } from "@/lib/ops/studio/department-status/types";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import {
  assessPackagePipelineStage,
  type PackagePipelineStage,
} from "@/lib/ops/studio/production/package-stage";
import { getPublisherRecord } from "@/lib/ops/studio/publisher/store";
import { normalizeRvtr } from "@/lib/studio/status";

import {
  buildCollectorOutputs,
  buildDirectorOutputs,
  buildEditorOutputs,
  buildPublisherOutputs,
} from "./build-outputs";
import { formatElapsed } from "./format-elapsed";
import {
  PRODUCTION_TRACKER_DEPARTMENTS,
  type ProductionTrackerDepartmentId,
  type ProductionTrackerSnapshot,
  type ProductionTrackerStep,
  type ProductionTrackerStepStatus,
} from "./types";

const DEPARTMENT_NAMES: Record<ProductionTrackerDepartmentId, string> = {
  collector: "Collector",
  editor: "Editor",
  director: "Director",
  publisher: "Publisher",
};

const OPEN_LABELS: Record<ProductionTrackerDepartmentId, string> = {
  collector: "Open Collector Output",
  editor: "Open Clean Dataset",
  director: "Open Experience",
  publisher: "Open Finished Package",
};

const OPEN_HINTS: Record<ProductionTrackerDepartmentId, string> = {
  collector: "Available after Collector completes",
  editor: "Available after Editor completes",
  director: "Available after Director completes",
  publisher: "Available after Publisher completes",
};

function stepOpenState(
  id: ProductionTrackerDepartmentId,
  flags: {
    hasCollector: boolean;
    hasEditor: boolean;
    hasDirector: boolean;
    publisherApproved: boolean;
  },
): { enabled: boolean; hint: string } {
  switch (id) {
    case "collector":
      return {
        enabled: flags.hasCollector,
        hint: OPEN_HINTS.collector,
      };
    case "editor":
      return {
        enabled: flags.hasEditor,
        hint: OPEN_HINTS.editor,
      };
    case "director":
      return {
        enabled: flags.hasDirector,
        hint: OPEN_HINTS.director,
      };
    case "publisher":
      return {
        enabled: flags.publisherApproved,
        hint: OPEN_HINTS.publisher,
      };
  }
}

function departmentHref(rvtr: string, id: ProductionTrackerDepartmentId, published: boolean): string {
  switch (id) {
    case "collector":
      return `/ops/studio/collector/${rvtr}`;
    case "editor":
      return `/ops/studio/editor/${rvtr}`;
    case "director":
      return `/ops/studio/director?rvtr=${rvtr}`;
    case "publisher":
      return published ? `/experience/${rvtr}` : `/ops/studio/publisher/${rvtr}`;
  }
}

function currentDepartmentFromStage(stage: PackagePipelineStage): ProductionTrackerDepartmentId | null {
  switch (stage) {
    case "missing_collector":
      return "collector";
    case "editor_queued":
      return "editor";
    case "director_queued":
      return "director";
    case "publisher_queued":
      return "publisher";
    case "published":
      return null;
    default:
      return "collector";
  }
}

function departmentComplete(
  id: ProductionTrackerDepartmentId,
  flags: {
    hasCollector: boolean;
    hasEditor: boolean;
    editorSubmitted: boolean;
    hasDirector: boolean;
    publisherApproved: boolean;
  },
): boolean {
  switch (id) {
    case "collector":
      return flags.hasCollector;
    case "editor":
      return flags.hasEditor && (flags.editorSubmitted || flags.hasDirector);
    case "director":
      return flags.hasDirector;
    case "publisher":
      return flags.publisherApproved;
  }
}

function stepStatus(
  id: ProductionTrackerDepartmentId,
  current: ProductionTrackerDepartmentId | null,
  runningDept: ProductionTrackerDepartmentId | null,
  complete: boolean,
  published: boolean,
): ProductionTrackerStepStatus {
  if (published && complete) return "complete";
  if (complete) return runningDept === id ? "running" : "complete";
  if (runningDept === id) return "running";
  if (current === id) return "active";

  const idIndex = PRODUCTION_TRACKER_DEPARTMENTS.indexOf(id);
  const currentIndex = current
    ? PRODUCTION_TRACKER_DEPARTMENTS.indexOf(current)
    : PRODUCTION_TRACKER_DEPARTMENTS.length;

  if (idIndex > currentIndex) return "waiting";
  if (idIndex < currentIndex) return "blocked";
  return "waiting";
}

function statusLabel(status: ProductionTrackerStepStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "running":
      return "In progress now";
    case "active":
      return "Up next";
    case "blocked":
      return "Blocked";
    case "waiting":
      return "Waiting";
  }
}

function stepSummary(
  id: ProductionTrackerDepartmentId,
  status: ProductionTrackerStepStatus,
  stageReason: string,
): string {
  if (status === "running") {
    return `${DEPARTMENT_NAMES[id]} is working on this song right now.`;
  }
  if (status === "complete") {
    return `${DEPARTMENT_NAMES[id]} finished its work for this package.`;
  }
  if (status === "active") {
    return stageReason;
  }
  if (status === "blocked") {
    return `Waiting for ${DEPARTMENT_NAMES[id]} to receive a complete handoff.`;
  }
  return `${DEPARTMENT_NAMES[id]} has not started yet.`;
}

function eventsForRvtr(events: StudioPipelineEvent[], rvtr: string): StudioPipelineEvent[] {
  const normalized = rvtr.toUpperCase();
  return events
    .filter((e) => e.rvtr?.toUpperCase() === normalized)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function resolveRunningDepartment(
  rvtr: string,
  collectorProgress: Awaited<ReturnType<typeof loadCollectorProgress>>,
  runtime: Awaited<ReturnType<typeof loadRuntimeProgressStore>>,
): ProductionTrackerDepartmentId | null {
  const normalized = rvtr.toUpperCase();
  if (
    collectorProgress.currentSong?.rvtr.toUpperCase() === normalized &&
    collectorProgress.status === "researching"
  ) {
    return "collector";
  }

  for (const id of ["editor", "director", "publisher"] as const) {
    const slot = runtime[id];
    if (slot.status === "running" && slot.currentSong?.rvtr.toUpperCase() === normalized) {
      return id;
    }
  }

  return null;
}

function resolveStartedAt(
  rvtr: string,
  runningDept: ProductionTrackerDepartmentId | null,
  collectorProgress: Awaited<ReturnType<typeof loadCollectorProgress>>,
  runtime: Awaited<ReturnType<typeof loadRuntimeProgressStore>>,
  events: StudioPipelineEvent[],
): string | null {
  const normalized = rvtr.toUpperCase();

  if (runningDept === "collector" && collectorProgress.startedAt) {
    return collectorProgress.startedAt;
  }

  if (runningDept && runningDept !== "collector") {
    const slot = runtime[runningDept];
    if (slot.startedAt) return slot.startedAt;
  }

  const firstStart = events.find(
    (e) =>
      e.type === "started" ||
      e.type === "collector_complete" ||
      e.type.includes("_started"),
  );
  return firstStart?.at ?? null;
}

function departmentCompletedAt(
  id: ProductionTrackerDepartmentId,
  events: StudioPipelineEvent[],
): string | null {
  const matchers: Record<ProductionTrackerDepartmentId, string[]> = {
    collector: ["collector_complete"],
    editor: ["editor_complete"],
    director: ["director_complete"],
    publisher: ["publisher_complete", "published"],
  };

  const matches = events.filter((e) => matchers[id].includes(e.type));
  return matches.length > 0 ? matches[matches.length - 1]!.at : null;
}

function departmentStartedAt(
  id: ProductionTrackerDepartmentId,
  events: StudioPipelineEvent[],
): string | null {
  const matchers: Record<ProductionTrackerDepartmentId, string[]> = {
    collector: ["started"],
    editor: ["editor_started"],
    director: ["director_started"],
    publisher: ["publisher_started"],
  };

  const match = events.find((e) => {
    if (matchers[id].includes(e.type)) return true;
    if (id === "collector" && e.department === "collector" && e.type === "started") return true;
    return e.department === id && e.type.includes("started");
  });
  return match?.at ?? null;
}

export async function loadProductionTrackerSnapshot(
  rvtrInput: string,
): Promise<ProductionTrackerSnapshot | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  const [
    assessment,
    collector,
    editor,
    director,
    publisherRecord,
    collectorProgress,
    runtime,
    allEvents,
  ] = await Promise.all([
    assessPackagePipelineStage(rvtr),
    loadCollectorPackage(rvtr),
    loadEditorStory(rvtr),
    loadDirectorPackage(rvtr),
    getPublisherRecord(rvtr),
    loadCollectorProgress(),
    loadRuntimeProgressStore(),
    loadPipelineEvents(),
  ]);

  const events = eventsForRvtr(allEvents, rvtr);
  const runningDept = resolveRunningDepartment(rvtr, collectorProgress, runtime);
  let currentDepartment = runningDept ?? currentDepartmentFromStage(assessment.stage);
  if (assessment.stage === "published") {
    currentDepartment = null;
  }

  const flags = {
    hasCollector: assessment.hasCollector,
    hasEditor: assessment.hasEditor,
    editorSubmitted: assessment.editorSubmitted,
    hasDirector: assessment.hasDirector,
    publisherApproved: assessment.publisherApproved,
  };

  const previousDepartments = PRODUCTION_TRACKER_DEPARTMENTS.filter((id) =>
    departmentComplete(id, flags),
  );

  const nextDepartment =
    currentDepartment == null
      ? null
      : PRODUCTION_TRACKER_DEPARTMENTS[
          PRODUCTION_TRACKER_DEPARTMENTS.indexOf(currentDepartment) + 1
        ] ?? null;

  const startedAt = resolveStartedAt(rvtr, runningDept, collectorProgress, runtime, events);
  const elapsedMs = startedAt ? Date.now() - new Date(startedAt).getTime() : null;

  const steps: ProductionTrackerStep[] = PRODUCTION_TRACKER_DEPARTMENTS.map((id) => {
    const complete = departmentComplete(id, flags);
    const status = stepStatus(
      id,
      currentDepartment,
      runningDept,
      complete,
      assessment.stage === "published",
    );

    const outputs =
      id === "collector"
        ? buildCollectorOutputs(collector)
        : id === "editor"
          ? buildEditorOutputs(collector, editor)
          : id === "director"
            ? buildDirectorOutputs(director)
            : buildPublisherOutputs(director, publisherRecord);

    const open = stepOpenState(id, flags);

    return {
      id,
      name: DEPARTMENT_NAMES[id],
      status,
      statusLabel: statusLabel(status),
      summary: stepSummary(id, status, assessment.reason),
      outputs,
      openLabel: OPEN_LABELS[id],
      openHref: departmentHref(rvtr, id, flags.publisherApproved),
      openEnabled: open.enabled,
      openHint: open.hint,
      startedAt: departmentStartedAt(id, events),
      completedAt: departmentCompletedAt(id, events),
    };
  });

  return {
    rvtr,
    artist: collector?.artist ?? publisherRecord?.artist ?? rvtr,
    title: collector?.title ?? publisherRecord?.title ?? rvtr,
    coverUrl: collector?.visualAssets?.coverUrl ?? publisherRecord?.coverUrl ?? null,
    generatedAt: new Date().toISOString(),
    currentDepartment,
    previousDepartments,
    nextDepartment,
    pipelineStage: assessment.stage,
    pipelineReason: assessment.reason,
    startedAt,
    elapsedMs,
    elapsedLabel: formatElapsed(elapsedMs),
    steps,
  };
}
