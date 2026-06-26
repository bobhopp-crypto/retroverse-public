import "server-only";

import { existsSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

import { loadArchiveRecords } from "./build-live-archive";
import { loadAllStarSnapshot } from "./load-allstar";
import { allstarArchiveDir, allstarBundledDataDir, allstarExtractorOutputDir, allstarReviewDir } from "./paths";

export type AuditIssue = {
  discId: string;
  scanFilename: string;
  player: string;
  category:
    | "missing_archive"
    | "missing_review"
    | "missing_intelligence"
    | "ocr_failure"
    | "geometry_failure"
    | "duplicate_player";
  detail: string;
};

export type CollectionAuditReport = {
  updatedAt: string;
  totalScans: number;
  preservedCount: number;
  intelligenceCount: number;
  reviewCount: number;
  archiveCount: number;
  clean: boolean;
  issues: AuditIssue[];
  duplicatePlayers: Array<{ player: string; discIds: string[] }>;
  masterDatasetReady: boolean;
  masterDatasetPath: string | null;
};

async function countIntelligenceFiles(): Promise<number> {
  const dir = join(allstarBundledDataDir(), "intelligence", "players");
  if (!existsSync(dir)) return 0;
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith(".json")).length;
}

async function listIntelligenceDiscIds(): Promise<Set<string>> {
  const dir = join(allstarBundledDataDir(), "intelligence", "players");
  const ids = new Set<string>();
  if (!existsSync(dir)) return ids;
  const files = await readdir(dir);
  for (const file of files) {
    if (file.endsWith(".json")) ids.add(file.replace(/\.json$/, ""));
  }
  return ids;
}

export async function buildCollectionAudit(): Promise<CollectionAuditReport> {
  const snapshot = await loadAllStarSnapshot();
  const archiveRecords = await loadArchiveRecords();
  const archiveByDisc = new Map(archiveRecords.map((r) => [r.id, r]));
  const intelIds = await listIntelligenceDiscIds();

  const reviewDir = allstarReviewDir();
  const reviewFiles = existsSync(reviewDir)
    ? new Set((await readdir(reviewDir)).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)))
    : new Set<string>();

  const issues: AuditIssue[] = [];
  const playerMap = new Map<string, string[]>();

  for (const disc of snapshot.discs) {
    const archive = archiveByDisc.get(disc.id);
    const player = archive?.player || disc.player || "";

    if (player.trim()) {
      const key = player.trim().toUpperCase();
      const list = playerMap.get(key) ?? [];
      list.push(disc.id);
      playerMap.set(key, list);
    }

    if (!archive) {
      issues.push({
        discId: disc.id,
        scanFilename: disc.scanFilename,
        player,
        category: "missing_archive",
        detail: "No archive JSON file",
      });
    }

    const reviewName = disc.reviewImageFilename;
    if (!reviewName || !reviewFiles.has(reviewName)) {
      issues.push({
        discId: disc.id,
        scanFilename: disc.scanFilename,
        player,
        category: "missing_review",
        detail: "Review image not generated",
      });
    }

    if (!intelIds.has(disc.id)) {
      issues.push({
        discId: disc.id,
        scanFilename: disc.scanFilename,
        player,
        category: "missing_intelligence",
        detail: "Intelligence record not generated",
      });
    }

    if (archive?.ocrStatus === "partial") {
      issues.push({
        discId: disc.id,
        scanFilename: disc.scanFilename,
        player,
        category: "ocr_failure",
        detail: "OCR partial — wedge labels incomplete",
      });
    }

    if (archive?.geometryStatus === "failed" || disc.geometryStatus === "failed") {
      issues.push({
        discId: disc.id,
        scanFilename: disc.scanFilename,
        player,
        category: "geometry_failure",
        detail: "Geometry validation failed",
      });
    }
  }

  const duplicatePlayers = [...playerMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([player, discIds]) => ({ player, discIds }));

  for (const dup of duplicatePlayers) {
    for (const discId of dup.discIds) {
      const disc = snapshot.discs.find((d) => d.id === discId);
      issues.push({
        discId,
        scanFilename: disc?.scanFilename ?? discId,
        player: dup.player,
        category: "duplicate_player",
        detail: `Duplicate player name across ${dup.discIds.length} discs`,
      });
    }
  }

  const masterPaths = [
    join(allstarExtractorOutputDir(), "allstar-master-dataset.json"),
    join(allstarBundledDataDir(), "allstar-master-dataset.json"),
  ];
  const masterDatasetPath = masterPaths.find((p) => existsSync(p)) ?? null;
  const preservedCount = archiveRecords.length;
  const totalScans = snapshot.stats.totalScans;

  return {
    updatedAt: new Date().toISOString(),
    totalScans,
    preservedCount,
    intelligenceCount: await countIntelligenceFiles(),
    reviewCount: reviewFiles.size,
    archiveCount: existsSync(allstarArchiveDir())
      ? (await readdir(allstarArchiveDir())).filter((f) => f.endsWith(".json")).length
      : 0,
    clean: issues.length === 0 && preservedCount >= totalScans,
    issues,
    duplicatePlayers,
    masterDatasetReady: preservedCount >= totalScans && masterDatasetPath != null,
    masterDatasetPath,
  };
}

export async function readMasterDataset(): Promise<Record<string, unknown> | null> {
  const paths = [
    join(allstarExtractorOutputDir(), "allstar-master-dataset.json"),
    join(allstarBundledDataDir(), "allstar-master-dataset.json"),
  ];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}
