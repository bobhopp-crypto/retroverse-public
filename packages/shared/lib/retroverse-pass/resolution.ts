import type { GeneratedPass } from "@/lib/ops/event-studio/pass-studio/types";
import type { PassStudioResolution } from "@/lib/ops/event-studio/pass-studio/store";

import { PassSerialAmbiguityError, type NormalizedPassSerial, type PassScanResult } from "./types";

export type PublicPassResolution =
  | { state: "canonical"; scan: PassScanResult }
  | { state: "fallback"; pass: GeneratedPass }
  | { state: "not_found" }
  | { state: "ambiguous" }
  | { state: "unavailable" };

export function statusForPublicPassResolution(resolution: PublicPassResolution): number {
  switch (resolution.state) {
    case "canonical":
    case "fallback":
      return 200;
    case "not_found":
      return 404;
    case "ambiguous":
      return 409;
    case "unavailable":
      return 503;
  }
}

type ResolutionDependencies = {
  scanCanonical: (serial: NormalizedPassSerial) => Promise<PassScanResult | null>;
  scanFallback: (serial: NormalizedPassSerial) => Promise<PassStudioResolution>;
};

/** Postgres is authoritative; JSON is consulted only after a confirmed miss. */
export async function resolvePublicPass(
  normalized: NormalizedPassSerial,
  dependencies: ResolutionDependencies,
): Promise<PublicPassResolution> {
  let canonical: PassScanResult | null;
  try {
    canonical = await dependencies.scanCanonical(normalized);
  } catch (error) {
    if (error instanceof PassSerialAmbiguityError) return { state: "ambiguous" };
    return { state: "unavailable" };
  }
  if (canonical) return { state: "canonical", scan: canonical };

  const fallback = await dependencies.scanFallback(normalized);
  if (fallback.state === "found") return { state: "fallback", pass: fallback.pass };
  return fallback;
}
