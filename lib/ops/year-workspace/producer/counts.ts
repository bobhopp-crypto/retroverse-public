import type { CategorySectionCounts } from "../production-types";
import type { YearWorkspaceCompletion } from "../types";

import type { ProducerAssetCategoryId, ProducerNeedFoundReady } from "./types";
import { productionCategoryForProducer } from "./config";

/** Map workspace sections → producer Need / Found / Ready. */
export function producerCountsFromSections(
  counts: CategorySectionCounts,
): ProducerNeedFoundReady {
  const need =
    counts.wanted + counts.queued + counts.acquired + counts.approved;
  const found = counts.acquired + counts.approved;
  const ready = counts.approved;
  return { need, found, ready, missing: Math.max(0, need - ready) };
}

export function songsProducerCounts(
  completion: YearWorkspaceCompletion,
): ProducerNeedFoundReady {
  const need =
    completion.chartOnlyPending +
    completion.inBoth;
  const found = completion.inBoth;
  const ready = completion.tagged;
  return { need, found, ready, missing: Math.max(0, need - ready) };
}

export function producerCountsForCategory(
  producerCategory: ProducerAssetCategoryId,
  summary: Record<string, CategorySectionCounts>,
  songsCompletion?: YearWorkspaceCompletion,
): ProducerNeedFoundReady {
  if (producerCategory === "songs" && songsCompletion) {
    return songsProducerCounts(songsCompletion);
  }
  const productionId = productionCategoryForProducer(producerCategory);
  if (!productionId || productionId === "songs") {
    return { need: 0, found: 0, ready: 0, missing: 0 };
  }
  const counts = summary[productionId];
  if (!counts) {
    return { need: 0, found: 0, ready: 0, missing: 0 };
  }
  return producerCountsFromSections(counts);
}
