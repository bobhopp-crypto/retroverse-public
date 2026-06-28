import "server-only";

import { cache } from "react";
import { access } from "fs/promises";

import { loadCollectorPackage, loadCollectorProgress } from "@/lib/ops/studio/collector/store";
import { collectorOutputPath } from "@/lib/ops/studio/collector/paths";
import { directorRenderSpecPath } from "@/lib/ops/studio/director/paths";
import { editorOutputPath } from "@/lib/ops/studio/editor/paths";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import {
  listRvtrDirectories,
  mapInBatches,
  STUDIO_SNAPSHOT_SCAN_LIMIT,
} from "@/lib/ops/studio/list-rvtrs";
import { isPublisherApproved } from "@/lib/ops/studio/publisher/store";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";
import { getPublisherStoreCached } from "@/lib/ops/studio/studio-cached-loaders";

import type { DepartmentLiveSong, DepartmentQueueIndex } from "./types";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

type ScanRow = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  hasCollector: boolean;
  hasEditor: boolean;
  hasDirector: boolean;
  editorSubmitted: boolean;
  editorWaitingHandoff: boolean;
  publisherEvaluated: boolean;
  publisherApproved: boolean;
};

async function scanRow(rvtr: string, publisherByRvtr: Map<string, PublisherRecord>): Promise<ScanRow | null> {
  try {
    const [hasCollector, hasEditor, hasDirector] = await Promise.all([
      fileExists(collectorOutputPath(rvtr)),
      fileExists(editorOutputPath(rvtr)),
      fileExists(directorRenderSpecPath(rvtr)),
    ]);

    const collector = hasCollector ? await loadCollectorPackage(rvtr) : null;
    const editor = hasEditor ? await loadEditorStory(rvtr) : null;
    const publisher = publisherByRvtr.get(rvtr);

    let editorSubmitted = false;
    let editorWaitingHandoff = false;

    if (editor) {
      const status = editor.meta.editorialStatus;
      const submitted =
        status === "submitted" || Boolean(editor.meta.directorHandoff?.submittedAt);
      if (submitted) {
        editorSubmitted = !hasDirector;
      } else if (status === "ready" || status === "in_progress" || status === "distilling") {
        editorWaitingHandoff = true;
      }
    }

    return {
      rvtr,
      artist: collector?.artist ?? publisher?.artist ?? rvtr,
      title: collector?.title ?? publisher?.title ?? rvtr,
      coverUrl: collector?.visualAssets?.coverUrl ?? publisher?.coverUrl ?? null,
      hasCollector,
      hasEditor,
      hasDirector,
      editorSubmitted,
      editorWaitingHandoff,
      publisherEvaluated: Boolean(publisher?.evaluation),
      publisherApproved: Boolean(publisher && isPublisherApproved(publisher)),
    };
  } catch {
    return null;
  }
}

function toSong(row: ScanRow): DepartmentLiveSong {
  return {
    rvtr: row.rvtr,
    artist: row.artist,
    title: row.title,
    coverUrl: row.coverUrl,
  };
}

/** Authoritative queue + package totals — single scan shared by all Studio pages. */
export async function buildDepartmentQueueIndex(): Promise<DepartmentQueueIndex> {
  const generatedAt = new Date().toISOString();
  const [{ rvtrs, total: totalVideoRows }, collectorProgress, publisherStore] = await Promise.all([
    listRvtrDirectories({ limit: STUDIO_SNAPSHOT_SCAN_LIMIT, recentFirst: true }),
    loadCollectorProgress().catch(() => null),
    getPublisherStoreCached(),
  ]);

  const publisherByRvtr = new Map(publisherStore.records.map((r) => [r.rvtr, r]));
  const rows = (
    await mapInBatches(rvtrs, 16, (rvtr) => scanRow(rvtr, publisherByRvtr))
  ).filter((row): row is ScanRow => row != null);

  let collectorComplete = 0;
  let editorComplete = 0;
  let editorWaitingHandoff = 0;
  let editorSubmittedWaitingDirector = 0;
  let directorComplete = 0;
  let publisherEvaluated = 0;
  let publisherApproved = 0;

  const collectorWaitingRows: ScanRow[] = [];
  const editorWaitingRows: ScanRow[] = [];
  const directorWaitingRows: ScanRow[] = [];
  const publisherWaitingRows: ScanRow[] = [];

  for (const row of rows) {
    if (row.hasCollector) collectorComplete += 1;
    else collectorWaitingRows.push(row);

    if (row.hasEditor) editorComplete += 1;

    if (row.hasCollector && !row.hasEditor) {
      editorWaitingRows.push(row);
    } else if (row.editorWaitingHandoff) {
      editorWaitingHandoff += 1;
      editorWaitingRows.push(row);
    }

    if (row.editorSubmitted) {
      editorSubmittedWaitingDirector += 1;
      directorWaitingRows.push(row);
    }

    if (row.hasDirector) directorComplete += 1;

    if (row.hasDirector && !row.publisherEvaluated) {
      publisherWaitingRows.push(row);
    } else if (row.publisherEvaluated && !row.publisherApproved) {
      publisherWaitingRows.push(row);
    }

    if (row.publisherEvaluated) publisherEvaluated += 1;
    if (row.publisherApproved) publisherApproved += 1;
  }

  const collectorQueued = collectorProgress?.queue ?? collectorWaitingRows.length;

  return {
    generatedAt,
    totalVideoRows,
    publishedTotal: publisherApproved,
    collector: {
      waiting: collectorQueued,
      complete: collectorComplete,
      nextInQueue: collectorProgress?.currentSong
        ? {
            rvtr: collectorProgress.currentSong.rvtr,
            artist: collectorProgress.currentSong.artist,
            title: collectorProgress.currentSong.title,
          }
        : collectorWaitingRows[0]
          ? toSong(collectorWaitingRows[0])
          : null,
    },
    editor: {
      waiting: Math.max(0, collectorComplete - editorComplete) + editorWaitingHandoff,
      complete: editorComplete,
      nextInQueue: editorWaitingRows[0] ? toSong(editorWaitingRows[0]) : null,
    },
    director: {
      waiting: editorSubmittedWaitingDirector,
      complete: directorComplete,
      nextInQueue: directorWaitingRows[0] ? toSong(directorWaitingRows[0]) : null,
    },
    publisher: {
      waiting:
        Math.max(0, directorComplete - publisherEvaluated) +
        Math.max(0, publisherEvaluated - publisherApproved),
      complete: publisherApproved,
      evaluated: publisherEvaluated,
      approved: publisherApproved,
      nextInQueue: publisherWaitingRows[0] ? toSong(publisherWaitingRows[0]) : null,
    },
  };
}

export const getDepartmentQueueIndexCached = cache(buildDepartmentQueueIndex);
