import "server-only";

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

import { loadArchiveRecords } from "./build-live-archive";
import { computeConfidenceFromArchive } from "./confidence";
import { buildCollectionAudit } from "./collection-audit";
import { loadAllStarSnapshot } from "./load-allstar";
import { displayCanonicalFile } from "./canonical-display";
import { loadPreserveQueue, type PreserveQueue, type PreserveQueueItem } from "./preserve-queue";
import { allstarBundledDataDir, allstarExtractorOutputDir } from "./paths";
import { loadReviewState } from "./review-state";

export type HarvestRunMetrics = {
  discsPerMinute: number | null;
  estimatedCompletionAt: string | null;
  estimatedMinutesRemaining: number | null;
  successRate: number;
  averageOcrConfidence: number;
  averageGeometryConfidence: number;
  averageArchiveConfidence: number;
};

export type HarvestDiscRef = {
  discId: string;
  scanFilename: string;
  canonicalFile: string | null;
  player: string;
  trustLevel?: string;
  archiveConfidence?: number;
};

export type CollectionHarvestMetrics = {
  preservedPercent: number;
  reviewedPercent: number;
  enrichedPercent: number;
  hallOfFamePercent: number;
  averageArchiveConfidence: number;
  run: HarvestRunMetrics;
  currentDisc: HarvestDiscRef | null;
  nextDisc: HarvestDiscRef | null;
  lastPreservedDisc: HarvestDiscRef | null;
  reportsReady: boolean;
};

function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function buildRunMetrics(queue: PreserveQueue | null, archives: Awaited<ReturnType<typeof loadArchiveRecords>>): HarvestRunMetrics {
  const completed = queue?.counts.completed ?? archives.length;
  const failed = queue?.counts.failed ?? 0;
  const attempted = completed + failed;
  const successRate = attempted > 0 ? Math.round((completed / attempted) * 1000) / 10 : 100;

  const confidences = archives.map((a) => computeConfidenceFromArchive(a));
  const averageOcrConfidence =
    Math.round(
      (confidences.reduce((s, c) => s + c.ocrConfidence, 0) / Math.max(confidences.length, 1)) * 10,
    ) / 10;
  const averageGeometryConfidence =
    Math.round(
      (confidences.reduce((s, c) => s + c.geometryConfidence, 0) / Math.max(confidences.length, 1)) * 10,
    ) / 10;
  const averageArchiveConfidence =
    Math.round(
      (confidences.reduce((s, c) => s + c.archiveConfidence, 0) / Math.max(confidences.length, 1)) * 10,
    ) / 10;

  let discsPerMinute: number | null = null;
  let estimatedCompletionAt: string | null = null;
  let estimatedMinutesRemaining: number | null = null;

  const startedAt = parseTime(queue?.startedAt);
  if (startedAt && completed > 1) {
    const elapsedMin = (Date.now() - startedAt) / 60000;
    if (elapsedMin > 0) {
      discsPerMinute = Math.round((completed / elapsedMin) * 100) / 100;
      const remaining = (queue?.counts.pending ?? 0) + (queue?.counts.processing ?? 0);
      if (discsPerMinute > 0 && remaining > 0) {
        estimatedMinutesRemaining = Math.ceil(remaining / discsPerMinute);
        estimatedCompletionAt = new Date(Date.now() + estimatedMinutesRemaining * 60000).toISOString();
      }
    }
  }

  return {
    discsPerMinute,
    estimatedCompletionAt,
    estimatedMinutesRemaining,
    successRate,
    averageOcrConfidence,
    averageGeometryConfidence,
    averageArchiveConfidence,
  };
}

function discRef(item: PreserveQueueItem, player = "", canonicalFile: string | null = null): HarvestDiscRef {
  const extended = item as PreserveQueueItem & { player?: string; trustLevel?: string; archiveConfidence?: number; canonicalFile?: string };
  return {
    discId: item.discId,
    scanFilename: item.scanFilename,
    canonicalFile: extended.canonicalFile ?? canonicalFile,
    player: extended.player || player,
    trustLevel: extended.trustLevel,
    archiveConfidence: extended.archiveConfidence,
  };
}

export async function buildCollectionHarvestMetrics(): Promise<CollectionHarvestMetrics> {
  const [snapshot, queue, archives, reviewState, audit] = await Promise.all([
    loadAllStarSnapshot(),
    loadPreserveQueue(),
    loadArchiveRecords(),
    loadReviewState(),
    buildCollectionAudit(),
  ]);

  const total = snapshot.stats.totalScans;
  const preserved = archives.length;
  const processed = snapshot.discs.filter((d) => d.processingStatus === "processed");

  const reviewed = processed.filter((d) => {
    const s = reviewState.items[d.id]?.status;
    return s && s !== "pending";
  }).length;

  let enriched = 0;
  const intelDir = join(allstarBundledDataDir(), "intelligence", "players");
  if (existsSync(intelDir)) {
    for (const record of archives) {
      const path = join(intelDir, `${record.id}.json`);
      if (!existsSync(path)) continue;
      try {
        const intel = JSON.parse(await readFile(path, "utf8")) as { enrichmentStatus?: string; statsSource?: string };
        if (intel.enrichmentStatus === "enriched" || intel.statsSource === "registry" || intel.statsSource === "registry-fuzzy") {
          enriched += 1;
        }
      } catch {
        /* skip */
      }
    }
  }

  const hofTotal = snapshot.discs.filter((d) => archives.find((a) => a.id === d.id)?.hallOfFame).length;
  const hofPreserved = archives.filter((a) => a.hallOfFame).length;
  const hofIdentified = Math.max(hofTotal, hofPreserved, 1);

  const run = buildRunMetrics(queue, archives);

  const archiveById = new Map(archives.map((a) => [a.id, a]));
  let currentDisc: HarvestDiscRef | null = null;
  let nextDisc: HarvestDiscRef | null = null;
  let lastPreservedDisc: HarvestDiscRef | null = null;

  if (queue) {
    const processing = queue.items.find((i) => i.state === "processing");
    const pending = queue.items.find((i) => i.state === "pending");
    const completed = [...queue.items]
      .filter((i) => i.state === "completed" && i.preservedAt)
      .sort((a, b) => parseTime(b.preservedAt)! - parseTime(a.preservedAt)!);

    if (processing) currentDisc = discRef(processing, "", archiveById.get(processing.discId)?.canonicalFile ?? null);
    if (pending) nextDisc = discRef(pending, "", archiveById.get(pending.discId)?.canonicalFile ?? null);
    if (completed[0]) {
      lastPreservedDisc = discRef(completed[0], "", archiveById.get(completed[0].discId)?.canonicalFile ?? null);
    }
  }

  if (!lastPreservedDisc && archives.length) {
    const latest = [...archives].sort(
      (a, b) => parseTime(b.preservedAt)! - parseTime(a.preservedAt)!,
    )[0];
    lastPreservedDisc = {
      discId: latest.id,
      scanFilename: latest.sourceFile,
      canonicalFile: latest.canonicalFile ?? null,
      player: latest.player,
      trustLevel: latest.trustLevel,
      archiveConfidence: latest.archiveConfidence,
    };
  }

  const reportsDir = join(allstarExtractorOutputDir(), "reports", "preservation-report.json");
  const bundledReports = join(allstarBundledDataDir(), "reports", "preservation-report.json");

  return {
    preservedPercent: Math.round((preserved / Math.max(total, 1)) * 1000) / 10,
    reviewedPercent: Math.round((reviewed / Math.max(processed.length, 1)) * 1000) / 10,
    enrichedPercent: Math.round((enriched / Math.max(preserved, 1)) * 1000) / 10,
    hallOfFamePercent: Math.round((hofPreserved / hofIdentified) * 1000) / 10,
    averageArchiveConfidence: run.averageArchiveConfidence,
    run,
    currentDisc,
    nextDisc,
    lastPreservedDisc,
    reportsReady: existsSync(reportsDir) || existsSync(bundledReports) || audit.masterDatasetReady,
  };
}
