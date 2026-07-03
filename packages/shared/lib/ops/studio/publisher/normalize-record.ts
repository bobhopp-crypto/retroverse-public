import { identifyStrings, type IdentifiedText } from "@/lib/ops/studio/model-identity";
import { modelListItemId } from "@/lib/ops/studio/model-identity";
import { ensurePublisherDecisionIds } from "@/lib/ops/studio/pipeline-event-id";

import type {
  PublisherDimensionScore,
  PublisherEvaluation,
  PublisherRecord,
} from "./types";

function normalizeDimensionNotes(
  dimensionId: string,
  notes: Array<string | IdentifiedText>,
): IdentifiedText[] {
  if (notes.length === 0) return [];
  if (typeof notes[0] === "object" && notes[0] !== null && "id" in notes[0]) {
    return notes as IdentifiedText[];
  }
  return identifyStrings(`${dimensionId}-note`, notes as string[]);
}

export function normalizePublisherEvaluation(
  evaluation: PublisherEvaluation,
): PublisherEvaluation {
  return {
    ...evaluation,
    dimensions: evaluation.dimensions.map((dim) => ({
      ...dim,
      notes: normalizeDimensionNotes(dim.id, dim.notes as Array<string | IdentifiedText>),
    })),
    experienceCritic: evaluation.experienceCritic
      ? {
          ...evaluation.experienceCritic,
          observations: evaluation.experienceCritic.observations.map((obs, sequence) => ({
            ...obs,
            id: obs.id ?? modelListItemId(`critic-${obs.area}`, sequence, obs.text),
          })),
        }
      : undefined,
  };
}

export function normalizePublisherRecord(record: PublisherRecord): PublisherRecord {
  return {
    ...record,
    evaluation: record.evaluation ? normalizePublisherEvaluation(record.evaluation) : null,
    decisions: ensurePublisherDecisionIds(record.rvtr, record.decisions),
  };
}

export function normalizePublisherStoreRecords(records: PublisherRecord[]): PublisherRecord[] {
  return records.map(normalizePublisherRecord);
}
