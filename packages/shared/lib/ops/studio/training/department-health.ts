import "server-only";

import { readdir } from "fs/promises";

import { researchDepartmentRoot } from "@/lib/studio/package";

import { buildTrainingSongSnapshot } from "./build-snapshot";
import { loadTrainingReviewStore } from "./store";
import type {
  DepartmentHealthRow,
  DepartmentHealthTrend,
  TrainingDepartmentId,
  TrainingHealthSnapshot,
  TrainingReviewRecord,
  TrainingSongSnapshot,
} from "./types";
import { TRAINING_DEPARTMENTS } from "./types";

const DEPT_LABELS: Record<TrainingDepartmentId, string> = {
  collector: "Collector",
  editor: "Editor",
  director: "Director",
  publisher: "Publisher",
  renderer: "Renderer",
};

function trendFromRates(recent: number, prior: number): DepartmentHealthTrend {
  const delta = recent - prior;
  if (delta >= 5) return "up";
  if (delta <= -5) return "down";
  return "stable";
}

function reviewsForDepartment(
  reviews: TrainingReviewRecord[],
  department: TrainingDepartmentId,
): TrainingReviewRecord[] {
  return reviews.filter((r) => r.department === department);
}

export async function buildTrainingHealthSnapshot(): Promise<TrainingHealthSnapshot> {
  const store = await loadTrainingReviewStore();
  const root = researchDepartmentRoot();
  let rvtrs: string[] = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    rvtrs = entries
      .filter((e) => e.isDirectory() && /^RVTR\d{6}$/i.test(e.name))
      .map((e) => e.name.toUpperCase())
      .slice(0, 40);
  } catch {
    rvtrs = [];
  }

  const snapshots: TrainingSongSnapshot[] = [];
  for (const rvtr of rvtrs) {
    const snap = await buildTrainingSongSnapshot(rvtr);
    if (snap) snapshots.push(snap);
  }

  const now = Date.now();
  const weekMs = 7 * 86400000;

  const departments: DepartmentHealthRow[] = TRAINING_DEPARTMENTS.map((department) => {
    const deptReviews = reviewsForDepartment(store.reviews, department);
    const confidences = snapshots
      .map((s) => s.departments.find((d) => d.department === department)?.confidence ?? 0)
      .filter((c) => c > 0);

    const approved = deptReviews.filter((r) => r.verdict === "approve").length;
    const coaching = deptReviews.filter((r) => r.verdict === "needs_coaching").length;
    const rejected = deptReviews.filter((r) => r.verdict === "reject").length;
    const reviewCount = deptReviews.length;
    const approvalRate = reviewCount > 0 ? Math.round((approved / reviewCount) * 100) : 0;

    const recent = deptReviews.filter(
      (r) => now - new Date(r.reviewedAt).getTime() <= weekMs,
    );
    const prior = deptReviews.filter((r) => {
      const age = now - new Date(r.reviewedAt).getTime();
      return age > weekMs && age <= weekMs * 2;
    });
    const recentRate =
      recent.length > 0
        ? Math.round((recent.filter((r) => r.verdict === "approve").length / recent.length) * 100)
        : approvalRate;
    const priorRate =
      prior.length > 0
        ? Math.round((prior.filter((r) => r.verdict === "approve").length / prior.length) * 100)
        : recentRate;

    const lastReviewedAt =
      deptReviews.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0]?.reviewedAt ?? null;

    const avgConfidence =
      confidences.length > 0
        ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
        : 0;

    return {
      department,
      label: DEPT_LABELS[department],
      averageConfidence: avgConfidence,
      averageApprovalRate: approvalRate,
      needsCoachingCount: coaching,
      rejectedCount: rejected,
      approvedCount: approved,
      reviewCount,
      lastReviewedAt,
      trend: trendFromRates(recentRate, priorRate),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    departments,
  };
}
