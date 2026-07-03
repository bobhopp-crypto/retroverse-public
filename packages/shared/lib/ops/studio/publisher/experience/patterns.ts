import "server-only";

import { loadDirectorPackage } from "@/lib/ops/studio/director/store";

import { openingExhibitPattern } from "./fingerprint";
import type { ExperiencePatternsSnapshot, ExperienceFingerprint } from "./types";
import { EXPERIENCE_FINGERPRINTS } from "./types";
import { ensureRowIds } from "@/lib/ops/studio/model-identity";
import { loadPublisherStore } from "../store";
import { listGoldenPackages } from "./store";

export async function buildExperiencePatterns(): Promise<ExperiencePatternsSnapshot> {
  const [publisherStore, golden] = await Promise.all([
    loadPublisherStore(),
    listGoldenPackages(),
  ]);

  const records = publisherStore.records.filter((r) => r.evaluation);
  const approved = records.filter((r) => r.approvedClass);

  const fingerprintStats = new Map<
    ExperienceFingerprint,
    { count: number; emotionTotal: number; showcase: number }
  >();

  for (const fp of EXPERIENCE_FINGERPRINTS) {
    fingerprintStats.set(fp, { count: 0, emotionTotal: 0, showcase: 0 });
  }

  const openingCounts = new Map<string, { count: number; scoreTotal: number }>();
  const rejectionCounts = new Map<string, number>();
  let uniquenessTotal = 0;

  for (const record of records) {
    const eval_ = record.evaluation!;
    const emotion = eval_.experienceScorecard?.emotionScore ?? eval_.qualityScore;
    uniquenessTotal += eval_.uniquenessScore ?? 100;

    for (const fp of eval_.fingerprints ?? []) {
      const row = fingerprintStats.get(fp);
      if (!row) continue;
      row.count += 1;
      row.emotionTotal += emotion;
      if (record.approvedClass === "showcase") row.showcase += 1;
    }

    if (record.approvedClass === "showcase") {
      // tracked per fingerprint above
    }

    for (const decision of record.decisions) {
      if (
        decision.action === "return_editor" ||
        decision.action === "return_director"
      ) {
        const key = decision.reason.slice(0, 100);
        rejectionCounts.set(key, (rejectionCounts.get(key) ?? 0) + 1);
      }
    }
  }

  for (const record of records) {
    const director = await loadDirectorPackage(record.rvtr);
    if (!director) continue;
    const pattern = openingExhibitPattern(director);
    const emotion = record.evaluation?.experienceScorecard?.emotionScore ?? record.evaluation?.qualityScore ?? 0;
    const row = openingCounts.get(pattern) ?? { count: 0, scoreTotal: 0 };
    row.count += 1;
    row.scoreTotal += emotion;
    openingCounts.set(pattern, row);
  }

  const fingerprintScores = EXPERIENCE_FINGERPRINTS.map((fingerprint) => {
    const row = fingerprintStats.get(fingerprint)!;
    return {
      id: fingerprint,
      fingerprint,
      count: row.count,
      avgEmotionScore: row.count > 0 ? Math.round(row.emotionTotal / row.count) : 0,
      showcaseRate:
        row.count > 0 ? Math.round((row.showcase / row.count) * 100) : 0,
    };
  }).sort((a, b) => b.avgEmotionScore - a.avgEmotionScore);

  const topOpenings = ensureRowIds(
    "exp-opening",
    [...openingCounts.entries()]
      .map(([exhibitPattern, row]) => ({
        exhibitPattern,
        count: row.count,
        avgScore: row.count > 0 ? Math.round(row.scoreTotal / row.count) : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 8),
    (row) => row.exhibitPattern,
  );

  const topRejections = ensureRowIds(
    "exp-rejection",
    [...rejectionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count })),
    (row) => row.reason,
  );

  const showcaseFingerprints = fingerprintScores
    .filter((row) => row.showcaseRate >= 25 && row.count >= 2)
    .map((row) => row.fingerprint);

  return {
    generatedAt: new Date().toISOString(),
    packageCount: records.length,
    approvedCount: approved.length,
    goldenCount: golden.length,
    fingerprintScores,
    topOpenings,
    topRejections,
    showcaseFingerprints,
    avgUniquenessScore:
      records.length > 0 ? Math.round(uniquenessTotal / records.length) : 100,
  };
}
