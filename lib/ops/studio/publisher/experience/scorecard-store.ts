import "server-only";

import { normalizeRvtr } from "@/lib/studio/status";

import { applyOperatorScorecard } from "./scorecard";
import type { ExperienceScorecardDimensionId } from "./types";
import { getPublisherRecord, upsertPublisherRecord } from "../store";

export async function saveOperatorExperienceScorecard(input: {
  rvtr: string;
  scores: Partial<Record<ExperienceScorecardDimensionId, number>>;
  note?: string | null;
}): Promise<import("../types").PublisherRecord> {
  const normalized = normalizeRvtr(input.rvtr);
  if (!normalized) throw new Error("invalid_rvtr");

  const record = await getPublisherRecord(normalized);
  if (!record?.evaluation?.experienceScorecard) throw new Error("no_scorecard");

  const experienceScorecard = applyOperatorScorecard(record.evaluation.experienceScorecard, {
    scores: input.scores,
    note: input.note,
  });

  return upsertPublisherRecord({
    ...record,
    evaluation: {
      ...record.evaluation,
      experienceScorecard,
    },
  });
}
