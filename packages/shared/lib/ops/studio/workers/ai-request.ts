/**
 * Studio workers — request AI through the canonical backend registry.
 */

import "server-only";

import type { AiGenerateRequest, AiGenerateResult } from "@/lib/studio/ai-backend";

import { getStudioAiBackendRegistry } from "@/lib/ops/studio/ai/registry";

export type { AiGenerateRequest, AiGenerateResult } from "@/lib/studio/ai-backend";

/** Request AI generation via the Studio backend abstraction. */
export async function requestStudioAi(request: AiGenerateRequest): Promise<AiGenerateResult> {
  return getStudioAiBackendRegistry().requestAi(request);
}

/** Check whether a registered backend kind is currently available. */
export async function studioAiBackendAvailable(
  kind: AiGenerateRequest["prefer"] = "ollama",
): Promise<boolean> {
  const backend = getStudioAiBackendRegistry().getByKind(kind ?? "ollama");
  if (!backend) return false;
  return backend.available();
}
