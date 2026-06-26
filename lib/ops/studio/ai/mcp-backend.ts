/**
 * Studio AI — MCP backend stub (not implemented).
 */

import type { AiGenerateRequest, AiGenerateResult, StudioAiBackend } from "@/lib/studio/ai-backend";
import { MCP_AI_BACKEND_ID } from "@/lib/studio/ai-backend";

const NOT_IMPLEMENTED = "MCP AI backend is not implemented";

export function createMcpAiBackendStub(): StudioAiBackend {
  return {
    id: MCP_AI_BACKEND_ID,
    kind: "mcp",
    displayName: "MCP (stub)",
    available: async () => false,
    health: async () => ({ ok: false, detail: NOT_IMPLEMENTED }),
    generate: async (_request: AiGenerateRequest): Promise<AiGenerateResult> => {
      throw new Error(NOT_IMPLEMENTED);
    },
  };
}
