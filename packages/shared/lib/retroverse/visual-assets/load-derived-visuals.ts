import type { DerivedVisual } from "./types";

/**
 * Future hook: load persisted derived visuals when generation ships.
 * Phase 2.7 — always returns empty; Renderer behavior unchanged.
 */
export async function loadDerivedVisuals(_rvtr: string): Promise<DerivedVisual[]> {
  return [];
}

export function findDerivedVisualForScene(
  derivedVisuals: DerivedVisual[],
  sourceImageId: string,
): DerivedVisual | null {
  return derivedVisuals.find((d) => d.sourceImageId === sourceImageId && d.generationStatus === "generated") ?? null;
}
