import "server-only";

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

import { loadArchiveRecords } from "./build-live-archive";
import { computeConfidenceFromArchive, type TrustLevel } from "./confidence";
import { loadAllStarSnapshot } from "./load-allstar";
import { allstarBundledDataDir } from "./paths";
import { loadReviewState } from "./review-state";
import type { AllStarDisc } from "./types";

export type ReviewPriorityEntry = {
  disc: AllStarDisc;
  score: number;
  reasons: string[];
  trustLevel: TrustLevel;
  archiveConfidence: number;
};

function intelPath(discId: string): string {
  return join(allstarBundledDataDir(), "intelligence", "players", `${discId}.json`);
}

export async function buildSmartReviewQueue(): Promise<ReviewPriorityEntry[]> {
  const [snapshot, archives, reviewState] = await Promise.all([
    loadAllStarSnapshot(),
    loadArchiveRecords(),
    loadReviewState(),
  ]);

  const archiveByDisc = new Map(archives.map((a) => [a.id, a]));

  const playerCounts = new Map<string, string[]>();
  for (const archive of archives) {
    const key = archive.player.trim().toUpperCase();
    if (!key) continue;
    const list = playerCounts.get(key) ?? [];
    list.push(archive.id);
    playerCounts.set(key, list);
  }

  const candidates = snapshot.discs.filter((d) => {
    const review = reviewState.items[d.id]?.status;
    if (review === "accepted") return false;
    return d.processingStatus === "processed" || archiveByDisc.has(d.id);
  });

  const entries: ReviewPriorityEntry[] = [];

  for (const disc of candidates) {
    const archive = archiveByDisc.get(disc.id);
    const confidence = archive ? computeConfidenceFromArchive(archive) : null;
    const trustLevel = confidence?.trustLevel ?? "review_required";
    const archiveConfidence = confidence?.archiveConfidence ?? 0;

    if (trustLevel === "trusted" && reviewState.items[disc.id]?.status === "accepted") {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    if (disc.processingStatus === "ocr_partial" || archive?.ocrStatus === "partial") {
      score += 1000;
      reasons.push("OCR failure / partial");
    }
    if (disc.geometryStatus === "failed" || archive?.geometryStatus === "failed") {
      score += 900;
      reasons.push("Geometry failure");
    }
    if (trustLevel === "review_required") {
      score += 800;
      reasons.push("Low archive confidence");
    } else if (trustLevel === "review_recommended") {
      score += 200;
      reasons.push("Review recommended");
    } else {
      score += 10;
    }

    const playerKey = (archive?.player || disc.player).trim().toUpperCase();
    if (playerKey && (playerCounts.get(playerKey)?.length ?? 0) > 1) {
      score += 600;
      reasons.push("Duplicate player match");
    }

    if (!existsSync(intelPath(disc.id))) {
      score += 500;
      reasons.push("Missing intelligence record");
    } else {
      try {
        const intel = JSON.parse(await readFile(intelPath(disc.id), "utf8")) as {
          enrichmentStatus?: string;
          statsSource?: string;
        };
        if (intel.enrichmentStatus === "pending" || intel.statsSource === "estimated") {
          score += 400;
          reasons.push("Intelligence not enriched");
        }
      } catch {
        score += 400;
        reasons.push("Intelligence read error");
      }
    }

    if (trustLevel === "trusted") {
      score = Math.max(score - 300, 0);
    }

    entries.push({ disc, score, reasons, trustLevel, archiveConfidence });
  }

  return entries.sort((a, b) => b.score - a.score);
}

export async function nextReviewDisc(): Promise<ReviewPriorityEntry | null> {
  const queue = await buildSmartReviewQueue();
  return queue[0] ?? null;
}
