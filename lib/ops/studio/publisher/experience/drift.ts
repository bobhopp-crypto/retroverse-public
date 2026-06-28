import "server-only";

import { randomUUID } from "crypto";

import { loadDirectorPackage } from "@/lib/ops/studio/director/store";

import { buildAutoExperienceScorecard } from "./scorecard";
import { appendDriftReport, listGoldenPackages } from "./store";
import type { ExperienceDriftReport, ExperienceDriftSample } from "./types";
import { getPublisherRecord } from "../store";

const DRIFT_SAMPLE_SIZE = 10;
const DRIFT_FAIL_DELTA = -5;
const DRIFT_FAIL_COUNT = 3;

/** Re-score golden packages — regression test for experience quality. */
export async function runExperienceDriftCheck(
  triggerRvtr: string | null = null,
): Promise<ExperienceDriftReport> {
  const golden = (await listGoldenPackages()).slice(0, DRIFT_SAMPLE_SIZE);
  const samples: ExperienceDriftSample[] = [];

  for (const pkg of golden) {
    const [director, publisher] = await Promise.all([
      loadDirectorPackage(pkg.rvtr),
      getPublisherRecord(pkg.rvtr),
    ]);
    if (!director) continue;

    const scorecard =
      publisher?.evaluation?.experienceScorecard ??
      buildAutoExperienceScorecard(director);
    const current = scorecard.emotionScore;
    const delta = current - pkg.baselineEmotionScore;

    samples.push({
      rvtr: pkg.rvtr,
      title: pkg.title,
      baselineEmotionScore: pkg.baselineEmotionScore,
      currentEmotionScore: current,
      delta,
    });
  }

  const averageDelta =
    samples.length > 0
      ? Math.round((samples.reduce((n, s) => n + s.delta, 0) / samples.length) * 10) / 10
      : 0;

  const regressions = samples.filter((s) => s.delta <= DRIFT_FAIL_DELTA);
  const passed = golden.length === 0 || regressions.length < DRIFT_FAIL_COUNT;

  const report: ExperienceDriftReport = {
    id: randomUUID(),
    triggeredAt: new Date().toISOString(),
    triggerRvtr,
    samples,
    averageDelta,
    passed,
    message: passed
      ? golden.length === 0
        ? "No golden packages yet — drift check skipped."
        : `Golden regression passed (${regressions.length} regressions, avg Δ ${averageDelta}).`
      : `Experience drift detected — ${regressions.length} golden packages dropped ≥${Math.abs(DRIFT_FAIL_DELTA)} pts.`,
  };

  await appendDriftReport(report);
  return report;
}

export async function getDriftWarning(): Promise<string | null> {
  const { getLatestDriftReport } = await import("./store");
  const report = await getLatestDriftReport();
  if (!report || report.passed) return null;
  return report.message;
}
