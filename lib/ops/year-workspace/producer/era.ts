import type { ProducerEraId, ProducerEraTargets } from "./types";

export const PRODUCER_ERA_IDS: ProducerEraId[] = ["1967", "1978", "1992", "mixed"];

export const DEFAULT_ERA_TARGETS_MINUTES: ProducerEraTargets = {
  1967: 30,
  1978: 30,
  1992: 30,
};

/** Solid era colors (CSS class suffix). */
export const PRODUCER_ERA_CSS: Record<ProducerEraId, string> = {
  1967: "1967",
  1978: "1978",
  1992: "1992",
  mixed: "mixed",
};

export function parseProducerEraId(value: unknown): ProducerEraId {
  if (value === "1967" || value === "1978" || value === "1992" || value === "mixed") {
    return value;
  }
  return "mixed";
}

export function eraDisplayLabel(eraId: ProducerEraId): string {
  if (eraId === "mixed") return "Mixed";
  return eraId;
}

export function normalizeEraTargets(raw: unknown): ProducerEraTargets {
  const base = { ...DEFAULT_ERA_TARGETS_MINUTES };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const era of ["1967", "1978", "1992"] as const) {
    const v = o[era];
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 24 * 60) {
      base[era] = Math.round(v);
    }
  }
  return base;
}
