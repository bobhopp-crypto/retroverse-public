/**
 * Studio AI — Ollama backend (wraps intelligence ollama client).
 */

import type { AiGenerateRequest, AiGenerateResult, StudioAiBackend } from "@/lib/studio/ai-backend";
import { OLLAMA_AI_BACKEND_ID } from "@/lib/studio/ai-backend";

import {
  intelligenceModel,
  ollamaAvailable,
  ollamaGenerate,
} from "@/lib/ops/intelligence/ollama-client";

export function createOllamaAiBackend(): StudioAiBackend {
  return {
    id: OLLAMA_AI_BACKEND_ID,
    kind: "ollama",
    displayName: "Local Ollama",
    available: ollamaAvailable,
    health: async () => {
      const started = Date.now();
      const ok = await ollamaAvailable();
      return {
        ok,
        latencyMs: Date.now() - started,
        detail: ok ? "Ollama reachable" : "Ollama unavailable at localhost:11434",
      };
    },
    generate: async (request: AiGenerateRequest): Promise<AiGenerateResult> => {
      const model = request.model ?? intelligenceModel();
      const text = await ollamaGenerate(request.prompt, {
        model,
        temperature: request.temperature,
        format: request.format,
        numPredict: request.numPredict,
      });
      return {
        text,
        backendId: OLLAMA_AI_BACKEND_ID,
        kind: "ollama",
        model,
      };
    },
  };
}
