/**
 * Studio AI — cloud provider backend stub (not implemented).
 */

import type { AiGenerateRequest, AiGenerateResult, StudioAiBackend } from "@/lib/studio/ai-backend";
import { CLOUD_AI_BACKEND_ID } from "@/lib/studio/ai-backend";

const NOT_IMPLEMENTED = "Cloud AI backend is not implemented";

export function createCloudAiBackendStub(): StudioAiBackend {
  return {
    id: CLOUD_AI_BACKEND_ID,
    kind: "cloud",
    displayName: "Cloud provider (stub)",
    available: async () => false,
    health: async () => ({ ok: false, detail: NOT_IMPLEMENTED }),
    generate: async (_request: AiGenerateRequest): Promise<AiGenerateResult> => {
      throw new Error(NOT_IMPLEMENTED);
    },
  };
}
