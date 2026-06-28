import "server-only";

import { cache } from "react";
import { existsSync, openSync, readFileSync, readSync, closeSync, readdirSync } from "fs";
import { join } from "path";

import { creativeReviewOutputPath } from "@/lib/ops/studio/creative-review/paths";
import { collectorOutputPath } from "@/lib/ops/studio/collector/paths";
import { directorRenderSpecPath } from "@/lib/ops/studio/director/paths";
import { editorOutputPath } from "@/lib/ops/studio/editor/paths";
import { getAllDepartmentLiveStatusesCached } from "@/lib/ops/studio/department-status";
import type { DepartmentLiveSong, StudioDepartmentId } from "@/lib/ops/studio/department-status/types";
import { eraAnchorForYear } from "@/lib/ops/studio/production/filter-by-era";
import { isPublisherApproved } from "@/lib/ops/studio/publisher/store";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";
import { getPublisherStoreCached } from "@/lib/ops/studio/studio-cached-loaders";
import type { ProductionSongResult } from "@/lib/ops/studio/production/run-song";
import { researchDepartmentRoot } from "@/lib/studio/package";

const RVTR_DIR = /^RVTR\d{6}$/i;
const BACKLOG_PROGRESS_PATH = join(process.cwd(), "reports/studio/collector-backlog-progress.json");

export type EraAnchor = 1980 | 1990 | 2005;

export type EraPipelineCounts = {
  era: EraAnchor;
  collectorComplete: number;
  editorComplete: number;
  directorComplete: number;
  published: number;
};

export type MissionControlDashboard = {
  generatedAt: string;
  /** Full-disk authoritative counts — single source of truth for Mission Control. */
  counts: {
    collectorComplete: number;
    needsEditor: number;
    needsDirector: number;
    needsCreativeReview: number;
    needsPublisher: number;
    published: number;
    failed: number;
    skipped: number;
    currentlyProcessing: number;
    backlogRemaining: number;
  };
  /** Collector-backlog assembly-line runner stats. */
  backlogRun: {
    enteredPipeline: number;
    failed: number;
    skipped: number;
    startedAt: string | null;
    updatedAt: string | null;
    throughputPerHour: number | null;
    estimatedCompletionAt: string | null;
  };
  /** Live department slot — what is running right now. */
  live: {
    currentlyProcessing: DepartmentLiveSong | null;
    processingDepartment: StudioDepartmentId | null;
    nextInQueue: DepartmentLiveSong | null;
    lastPublished: {
      rvtr: string;
      artist: string;
      title: string;
      publishedAt: string | null;
    } | null;
  };
  eraProgress: EraPipelineCounts[];
  /** Bar fill ratios 0–1 for production health display. */
  healthBars: {
    stage: "collector" | "editor" | "director" | "creativeReview" | "publisher" | "published";
    label: string;
    complete: number;
    total: number;
    ratio: number;
  }[];
};

type BacklogProgressFile = {
  startedAt?: string;
  updatedAt?: string;
  processedRvtrs?: string[];
  failedRvtrs?: string[];
  results?: ProductionSongResult[];
};

function readCollectorYear(rvtr: string): number | null {
  const path = collectorOutputPath(rvtr);
  if (!existsSync(path)) return null;
  try {
    const fd = openSync(path, "r");
    // Canonical song identity.year sits ~1.6–2.0 KB into collector.json (after package status block).
    const buf = Buffer.alloc(2048);
    readSync(fd, buf, 0, 2048, 0);
    closeSync(fd);
    const match = buf
      .toString("utf8")
      .match(/"identity"\s*:\s*\{\s*"rvtr"[\s\S]*?"year"\s*:\s*(\d{4})/);
    if (!match) return null;
    const year = Number.parseInt(match[1]!, 10);
    return year >= 1960 && year <= 2030 ? year : null;
  } catch {
    return null;
  }
}

function loadBacklogProgress(): BacklogProgressFile | null {
  if (!existsSync(BACKLOG_PROGRESS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(BACKLOG_PROGRESS_PATH, "utf8")) as BacklogProgressFile;
  } catch {
    return null;
  }
}

function countSkippedResults(results: ProductionSongResult[] | undefined): number {
  if (!results?.length) return 0;
  return results.filter((r) => {
    const s = r.stages;
    return (
      s.collector === "skipped" &&
      s.editor === "skipped" &&
      s.director === "skipped" &&
      (s.publisher === "skipped" || s.publisher === "approved")
    );
  }).length;
}

function computeThroughput(results: ProductionSongResult[] | undefined): number | null {
  if (!results?.length) return null;
  const recent = results.slice(-100);
  const avgMs = recent.reduce((sum, r) => sum + r.runtimeMs, 0) / recent.length;
  if (avgMs <= 0) return null;
  return Math.round((3_600_000 / avgMs) * 10) / 10;
}

function estimateCompletion(
  backlogRemaining: number,
  throughputPerHour: number | null,
): string | null {
  if (backlogRemaining <= 0) return "Complete";
  if (throughputPerHour == null || throughputPerHour <= 0) return null;
  const hoursLeft = backlogRemaining / throughputPerHour;
  const eta = new Date(Date.now() + hoursLeft * 60 * 60 * 1000);
  return eta.toISOString();
}

function scanFullDiskCounts(publisherByRvtr: Map<string, PublisherRecord>, failedRvtrs: Set<string>) {
  const root = researchDepartmentRoot();
  let collectorComplete = 0;
  let needsEditor = 0;
  let needsDirector = 0;
  let needsCreativeReview = 0;
  let needsPublisher = 0;
  let published = 0;

  const eraTotals: Record<EraAnchor, EraPipelineCounts> = {
    1980: { era: 1980, collectorComplete: 0, editorComplete: 0, directorComplete: 0, published: 0 },
    1990: { era: 1990, collectorComplete: 0, editorComplete: 0, directorComplete: 0, published: 0 },
    2005: { era: 2005, collectorComplete: 0, editorComplete: 0, directorComplete: 0, published: 0 },
  };

  let dirs: string[];
  try {
    dirs = readdirSync(root);
  } catch {
    return {
      collectorComplete: 0,
      needsEditor: 0,
      needsDirector: 0,
      needsCreativeReview: 0,
      needsPublisher: 0,
      published: 0,
      failed: failedRvtrs.size,
      skipped: 0,
      backlogRemaining: 0,
      eraTotals: Object.values(eraTotals),
    };
  }

  for (const name of dirs) {
    if (!RVTR_DIR.test(name)) continue;
    const rvtr = name.toUpperCase();
    if (!existsSync(collectorOutputPath(rvtr))) continue;

    collectorComplete += 1;
    const year = readCollectorYear(rvtr);
    const era = eraAnchorForYear(year);
    if (era) eraTotals[era].collectorComplete += 1;

    const hasEditor = existsSync(editorOutputPath(rvtr));
    const hasDirector = existsSync(directorRenderSpecPath(rvtr));
    const hasCreativeReview = existsSync(creativeReviewOutputPath(rvtr));

    if (hasEditor && era) eraTotals[era].editorComplete += 1;
    if (hasDirector && era) eraTotals[era].directorComplete += 1;

    const record = publisherByRvtr.get(rvtr);
    const publisherEvaluated = Boolean(record?.evaluation);
    const publisherApproved = Boolean(record && isPublisherApproved(record));

    if (publisherApproved) {
      published += 1;
      if (era) eraTotals[era].published += 1;
      continue;
    }

    if (!hasEditor) {
      needsEditor += 1;
    } else if (!hasDirector) {
      needsDirector += 1;
    } else if (!hasCreativeReview) {
      needsCreativeReview += 1;
    } else if (!publisherEvaluated || !publisherApproved) {
      needsPublisher += 1;
    }
  }

  return {
    collectorComplete,
    needsEditor,
    needsDirector,
    needsCreativeReview,
    needsPublisher,
    published,
    failed: failedRvtrs.size,
    skipped: 0,
    backlogRemaining: Math.max(0, collectorComplete - published),
    eraTotals: Object.values(eraTotals),
  };
}

function resolveLiveProcessing(
  departments: Awaited<ReturnType<typeof getAllDepartmentLiveStatusesCached>>,
): {
  currentlyProcessing: DepartmentLiveSong | null;
  processingDepartment: StudioDepartmentId | null;
  nextInQueue: DepartmentLiveSong | null;
} {
  const order: StudioDepartmentId[] = ["collector", "editor", "director", "publisher"];
  for (const id of order) {
    const live = departments[id];
    if (live.status === "running" && live.currentSong) {
      return {
        currentlyProcessing: live.currentSong,
        processingDepartment: id,
        nextInQueue: live.currentSong,
      };
    }
  }
  for (const id of order) {
    const live = departments[id];
    if (live.currentSong) {
      return {
        currentlyProcessing: null,
        processingDepartment: null,
        nextInQueue: live.currentSong,
      };
    }
  }
  return { currentlyProcessing: null, processingDepartment: null, nextInQueue: null };
}

export async function loadMissionControlDashboard(): Promise<MissionControlDashboard> {
  const [publisherStore, departments] = await Promise.all([
    getPublisherStoreCached(),
    getAllDepartmentLiveStatusesCached(),
  ]);

  const publisherByRvtr = new Map(publisherStore.records.map((r) => [r.rvtr, r]));
  const backlog = loadBacklogProgress();
  const failedRvtrs = new Set(backlog?.failedRvtrs ?? []);
  const disk = scanFullDiskCounts(publisherByRvtr, failedRvtrs);
  const skipped = countSkippedResults(backlog?.results);
  disk.skipped = skipped;

  const live = resolveLiveProcessing(departments);
  const currentlyProcessing = live.currentlyProcessing ? 1 : 0;

  const lastPublishedRecord = publisherStore.records
    .filter((r) => isPublisherApproved(r))
    .sort((a, b) => {
      const ta = a.publishedAt ?? a.approvedAt ?? "";
      const tb = b.publishedAt ?? b.approvedAt ?? "";
      return tb.localeCompare(ta);
    })[0];

  const total = disk.collectorComplete || 1;
  const healthBars: MissionControlDashboard["healthBars"] = [
    {
      stage: "collector",
      label: "Collector",
      complete: disk.collectorComplete,
      total,
      ratio: disk.collectorComplete / total,
    },
    {
      stage: "editor",
      label: "Editor",
      complete: disk.collectorComplete - disk.needsEditor,
      total,
      ratio: (disk.collectorComplete - disk.needsEditor) / total,
    },
    {
      stage: "director",
      label: "Director",
      complete: disk.collectorComplete - disk.needsEditor - disk.needsDirector,
      total,
      ratio: (disk.collectorComplete - disk.needsEditor - disk.needsDirector) / total,
    },
    {
      stage: "creativeReview",
      label: "Creative Review",
      complete:
        disk.collectorComplete -
        disk.needsEditor -
        disk.needsDirector -
        disk.needsCreativeReview,
      total,
      ratio:
        (disk.collectorComplete -
          disk.needsEditor -
          disk.needsDirector -
          disk.needsCreativeReview) /
        total,
    },
    {
      stage: "publisher",
      label: "Publisher",
      complete: disk.published + disk.needsPublisher,
      total,
      ratio: (disk.published + disk.needsPublisher) / total,
    },
    {
      stage: "published",
      label: "Published",
      complete: disk.published,
      total,
      ratio: disk.published / total,
    },
  ];

  const throughputPerHour = computeThroughput(backlog?.results);

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      collectorComplete: disk.collectorComplete,
      needsEditor: disk.needsEditor,
      needsDirector: disk.needsDirector,
      needsCreativeReview: disk.needsCreativeReview,
      needsPublisher: disk.needsPublisher,
      published: disk.published,
      failed: disk.failed,
      skipped,
      currentlyProcessing,
      backlogRemaining: disk.backlogRemaining,
    },
    backlogRun: {
      enteredPipeline: backlog?.processedRvtrs?.length ?? 0,
      failed: failedRvtrs.size,
      skipped,
      startedAt: backlog?.startedAt ?? null,
      updatedAt: backlog?.updatedAt ?? null,
      throughputPerHour,
      estimatedCompletionAt: estimateCompletion(disk.backlogRemaining, throughputPerHour),
    },
    live: {
      ...live,
      lastPublished: lastPublishedRecord
        ? {
            rvtr: lastPublishedRecord.rvtr,
            artist: lastPublishedRecord.artist,
            title: lastPublishedRecord.title,
            publishedAt: lastPublishedRecord.publishedAt ?? lastPublishedRecord.approvedAt ?? null,
          }
        : null,
    },
    eraProgress: disk.eraTotals,
    healthBars,
  };
}

export const getMissionControlDashboardCached = cache(loadMissionControlDashboard);
