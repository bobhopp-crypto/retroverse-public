import "server-only";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";

import { detectExperienceFingerprints, hashDirectorPlan } from "./fingerprint";
import { buildAutoExperienceScorecard } from "./scorecard";
import { getGoldenPackage, isGoldenPackage, promoteGoldenPackage } from "./store";
import type { GoldenPackageRecord } from "./types";
import { getPublisherRecord, upsertPublisherRecord } from "../store";

export async function promoteToGoldenPackage(input: {
  rvtr: string;
  promotedBy?: string;
  showcaseReason?: string;
  publisherComment?: string;
}): Promise<GoldenPackageRecord> {
  const record = await getPublisherRecord(input.rvtr);
  if (!record?.evaluation) throw new Error("no_evaluation");

  const isApproved =
    record.approvedClass === "ready" ||
    record.approvedClass === "extended" ||
    record.approvedClass === "showcase";
  if (!isApproved) throw new Error("must_be_approved");

  const [director, collector] = await Promise.all([
    loadDirectorPackage(input.rvtr),
    loadCollectorPackage(input.rvtr),
  ]);
  if (!director) throw new Error("no_director");

  const fingerprint =
    record.evaluation.fingerprints ??
    detectExperienceFingerprints(director, collector);
  const scorecard =
    record.evaluation.experienceScorecard ??
    buildAutoExperienceScorecard(director);

  const showcaseDecision = record.decisions.find(
    (d) => d.action === "approve_showcase",
  );
  const showcaseReason =
    input.showcaseReason?.trim() ||
    showcaseDecision?.reason ||
    record.evaluation.why;

  const golden: GoldenPackageRecord = {
    rvtr: record.rvtr,
    artist: record.artist,
    title: record.title,
    coverUrl: record.coverUrl,
    promotedAt: new Date().toISOString(),
    promotedBy: input.promotedBy?.trim() || "operator",
    showcaseReason,
    publisherComment: input.publisherComment?.trim() || showcaseReason,
    fingerprint,
    baselineEmotionScore: scorecard.emotionScore,
    baselineQualityScore: record.evaluation.qualityScore,
    planFingerprint: hashDirectorPlan(director),
    criticObservations: record.evaluation.experienceCritic?.observations ?? [],
  };

  await promoteGoldenPackage(golden);

  await upsertPublisherRecord({
    ...record,
    isGolden: true,
    goldenPromotedAt: golden.promotedAt,
  });

  return golden;
}

export async function assertNotGoldenForDirectorRun(rvtr: string): Promise<void> {
  if (await isGoldenPackage(rvtr)) {
    throw new Error("golden_package_frozen");
  }
}

export async function goldenStatusForRvtr(rvtr: string): Promise<{
  isGolden: boolean;
  golden: GoldenPackageRecord | null;
}> {
  const golden = await getGoldenPackage(rvtr);
  return { isGolden: Boolean(golden), golden };
}
