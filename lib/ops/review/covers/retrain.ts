import {
  buildTrainingWeights,
  writeTrainingWeights,
  type TrainingWeights,
} from "@/lib/cover-integrity/training-weights";
import {
  loadTrainingDecisions,
  type CoverTrainingStore,
} from "@/lib/rv12/training-decisions";

export async function retrainCoverReview(): Promise<{
  store: CoverTrainingStore;
  weights: TrainingWeights;
  weightsPath: string;
}> {
  const store = await loadTrainingDecisions();
  const weights = buildTrainingWeights(store);
  const weightsPath = await writeTrainingWeights(weights);
  return { store, weights, weightsPath };
}
