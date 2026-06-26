/**
 * Retroverse Studio — bootstrapped AI backend registry.
 */

import "server-only";

import {
  createStudioAiBackendRegistry,
  type StudioAiBackendRegistry,
} from "@/lib/studio/ai-backend";

import { createCloudAiBackendStub } from "./cloud-backend";
import { createMcpAiBackendStub } from "./mcp-backend";
import { createOllamaAiBackend } from "./ollama-backend";

const AI_REGISTRY_CACHE_KEY = "__studioAiBackendRegistry";

function readCachedRegistry(): StudioAiBackendRegistry | undefined {
  return (globalThis as Record<string, unknown>)[AI_REGISTRY_CACHE_KEY] as
    | StudioAiBackendRegistry
    | undefined;
}

function writeCachedRegistry(registry: StudioAiBackendRegistry): void {
  (globalThis as Record<string, unknown>)[AI_REGISTRY_CACHE_KEY] = registry;
}

function bootstrapRegistry(): StudioAiBackendRegistry {
  const registry = createStudioAiBackendRegistry({ defaultKind: "ollama" });
  registry.register(createOllamaAiBackend());
  registry.register(createMcpAiBackendStub());
  registry.register(createCloudAiBackendStub());
  return registry;
}

/** Shared in-process AI backend registry. */
export function getStudioAiBackendRegistry(): StudioAiBackendRegistry {
  const cached = readCachedRegistry();
  if (cached) return cached;
  const registry = bootstrapRegistry();
  writeCachedRegistry(registry);
  return registry;
}

/** Reset registry (tests only). */
export function resetStudioAiBackendRegistryForTests(): void {
  delete (globalThis as Record<string, unknown>)[AI_REGISTRY_CACHE_KEY];
}

export { createOllamaAiBackend } from "./ollama-backend";
export { createMcpAiBackendStub } from "./mcp-backend";
export { createCloudAiBackendStub } from "./cloud-backend";
