import "server-only";

import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadPublisherStore } from "@/lib/ops/studio/publisher/store";
import { loadTrainingReviewStore } from "@/lib/ops/studio/training/store";
import { researchDepartmentRoot } from "@/lib/studio/package";
import { readdir } from "fs/promises";

import { ensureRowIds } from "@/lib/ops/studio/model-identity";

import { buildCoachingRuleHints } from "./rules";
import { buildExhibitFrameRanks, summarizePlanScenes } from "./frame-ranking";
import {
  getPreviousPlanSnapshot,
  listAllCoachingRecords,
  listExhibitCoachingForRvtr,
} from "./store";
import type {
  DirectorAnalyticsSnapshot,
  DirectorTrainingPayload,
  ExhibitTrainingView,
} from "./types";

function trendFromRates(recent: number, prior: number): DirectorAnalyticsSnapshot["recentTrend"] {
  const delta = recent - prior;
  if (delta >= 5) return "improving";
  if (delta <= -5) return "declining";
  return "stable";
}

export async function buildDirectorAnalytics(): Promise<DirectorAnalyticsSnapshot> {
  const [records, publisherStore, trainingStore, directorRvtrs] = await Promise.all([
    listAllCoachingRecords(),
    loadPublisherStore(),
    loadTrainingReviewStore(),
    listDirectorRvtrs(),
  ]);

  const hints = buildCoachingRuleHints(records);
  const reasonEntries = Object.entries(hints.reasonCounts).sort((a, b) => b[1] - a[1]);

  const exhibitRejections = new Map<string, number>();
  const categoryAccepted = new Map<string, number>();
  let wrongCount = 0;

  for (const record of records) {
    if (record.verdict === "wrong") {
      wrongCount += 1;
      exhibitRejections.set(record.exhibitId, (exhibitRejections.get(record.exhibitId) ?? 0) + 1);
    }
    if (record.verdict === "perfect" && record.frameCategory) {
      categoryAccepted.set(
        record.frameCategory,
        (categoryAccepted.get(record.frameCategory) ?? 0) + 1,
      );
    }
  }

  const publisherReviews = trainingStore.reviews.filter((r) => r.department === "publisher");
  const approved = publisherReviews.filter((r) => r.verdict === "approve").length;
  const approvalRate =
    publisherReviews.length > 0 ? Math.round((approved / publisherReviews.length) * 100) : 0;

  const qualityScores = publisherStore.records
    .map((r) => r.evaluation?.qualityScore ?? 0)
    .filter((s) => s > 0);
  const averagePublisherScore =
    qualityScores.length > 0
      ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
      : 0;

  let exhibitTotal = 0;
  let exhibitPackages = 0;
  for (const rvtr of directorRvtrs.slice(0, 80)) {
    const director = await loadDirectorPackage(rvtr);
    if (!director) continue;
    exhibitPackages += 1;
    exhibitTotal += director.experiencePlan.scenes.filter((s) =>
      s.narrativePurpose.startsWith("museum_exhibit:"),
    ).length;
  }

  const categoryPreference = [...categoryAccepted.entries()]
    .map(([category, accepted]) => ({
      category,
      accepted,
      rejected: records.filter((r) => r.frameCategory === category && r.verdict === "wrong").length,
      score: accepted - records.filter((r) => r.frameCategory === category && r.verdict === "wrong").length,
    }))
    .sort((a, b) => b.score - a.score);

  const coachedRvtrs = new Set(records.map((r) => r.rvtr));
  const interventionRvtrs = new Set(
    records.filter((r) => r.verdict === "wrong").map((r) => r.rvtr),
  );

  const now = Date.now();
  const weekMs = 7 * 86400000;
  const recentWrong = records.filter(
    (r) => r.verdict === "wrong" && now - new Date(r.coachedAt).getTime() <= weekMs,
  ).length;
  const priorWrong = records.filter((r) => {
    const age = now - new Date(r.coachedAt).getTime();
    return r.verdict === "wrong" && age > weekMs && age <= weekMs * 2;
  }).length;
  const recentTotal = records.filter((r) => now - new Date(r.coachedAt).getTime() <= weekMs).length;
  const priorTotal = records.filter((r) => {
    const age = now - new Date(r.coachedAt).getTime();
    return age > weekMs && age <= weekMs * 2;
  }).length;
  const recentWrongRate = recentTotal > 0 ? Math.round((1 - recentWrong / recentTotal) * 100) : 0;
  const priorWrongRate = priorTotal > 0 ? Math.round((1 - priorWrong / priorTotal) * 100) : 0;

  return {
    generatedAt: new Date().toISOString(),
    totalCoachingRecords: records.length,
    songsCoached: coachedRvtrs.size,
    publisherApprovalRate: approvalRate,
    averageExhibitsPerExperience:
      exhibitPackages > 0 ? Math.round((exhibitTotal / exhibitPackages) * 10) / 10 : 5,
    averagePublisherScore,
    mostRejectedExhibit:
      [...exhibitRejections.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    mostAcceptedFrameCategory: categoryPreference[0]?.category ?? null,
    topCoachingReasons: ensureRowIds(
      "coach-reason",
      reasonEntries.slice(0, 8).map(([reason, count]) => ({ reason, count })),
      (row) => row.reason,
    ),
    categoryPreference: ensureRowIds(
      "frame-cat",
      categoryPreference.slice(0, 8),
      (row) => row.category,
    ),
    songsNeedingIntervention: interventionRvtrs.size,
    recentTrend: trendFromRates(recentWrongRate, priorWrongRate),
  };
}

async function listDirectorRvtrs(): Promise<string[]> {
  try {
    const entries = await readdir(researchDepartmentRoot(), { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && /^RVTR\d{6}$/i.test(e.name))
      .map((e) => e.name.toUpperCase());
  } catch {
    return [];
  }
}

export async function buildDirectorTrainingPayload(rvtr: string): Promise<DirectorTrainingPayload | null> {
  const [director, collector, coaching, previous, analytics] = await Promise.all([
    loadDirectorPackage(rvtr),
    loadCollectorPackage(rvtr),
    listExhibitCoachingForRvtr(rvtr),
    getPreviousPlanSnapshot(rvtr),
    buildDirectorAnalytics(),
  ]);

  if (!director) return null;

  const ranks = collector ? buildExhibitFrameRanks(director, collector) : [];
  const coverUrl = collector?.visualAssets.coverUrl ?? collector?.song?.coverUrl ?? null;

  const exhibits: ExhibitTrainingView[] = ranks.map((row) => ({
    exhibitId: row.exhibitId,
    label: row.label,
    sceneNumber: row.sceneNumber,
    headline:
      director.experiencePlan.scenes.find((s) => s.sceneNumber === row.sceneNumber)?.headline ?? "",
    frame: row.frame,
    coverUrl: row.exhibitId === "cover" ? coverUrl : null,
    coaching: coaching.find((c) => c.exhibitId === row.exhibitId) ?? null,
  }));

  const abComparison = previous
    ? {
        current: {
          generatedAt: director.generatedAt,
          scenes: summarizePlanScenes(director.experiencePlan),
        },
        previous: {
          savedAt: previous.savedAt,
          generatedAt: previous.generatedAt,
          scenes: summarizePlanScenes(previous.experiencePlan),
        },
      }
    : null;

  return { rvtr, exhibits, abComparison, analytics };
}
