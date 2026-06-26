/**
 * Retroverse Studio Kernel — AI backend registry and request interface.
 *
 * Department workers and ops code request AI through this layer instead of
 * calling Ollama, MCP, or cloud providers directly.
 */

import type { WorkerHealth } from "./worker";

export type AiBackendKind = "ollama" | "mcp" | "cloud";

export type AiGenerateRequest = {
  prompt: string;
  model?: string;
  temperature?: number;
  format?: "json";
  numPredict?: number;
  /** Prefer a specific registered backend instance. */
  backendId?: string;
  /** Prefer a backend kind when backendId is omitted. */
  prefer?: AiBackendKind;
};

export type AiGenerateResult = {
  text: string;
  backendId: string;
  kind: AiBackendKind;
  model: string;
};

export type StudioAiBackend = {
  id: string;
  kind: AiBackendKind;
  displayName: string;
  available(): Promise<boolean>;
  health(): Promise<WorkerHealth>;
  generate(request: AiGenerateRequest): Promise<AiGenerateResult>;
};

export type StudioAiBackendRegistry = {
  register(backend: StudioAiBackend): StudioAiBackend;
  unregister(backendId: string): boolean;
  list(): StudioAiBackend[];
  get(backendId: string): StudioAiBackend | undefined;
  getByKind(kind: AiBackendKind): StudioAiBackend | undefined;
  requestAi(request: AiGenerateRequest): Promise<AiGenerateResult>;
};

export function createStudioAiBackendRegistry(
  options: { defaultKind?: AiBackendKind } = {},
): StudioAiBackendRegistry {
  const defaultKind = options.defaultKind ?? "ollama";
  const backends = new Map<string, StudioAiBackend>();

  function register(backend: StudioAiBackend): StudioAiBackend {
    backends.set(backend.id, backend);
    return backend;
  }

  function unregister(backendId: string): boolean {
    return backends.delete(backendId);
  }

  function list(): StudioAiBackend[] {
    return [...backends.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  function get(backendId: string): StudioAiBackend | undefined {
    return backends.get(backendId);
  }

  function getByKind(kind: AiBackendKind): StudioAiBackend | undefined {
    return list().find((backend) => backend.kind === kind);
  }

  async function resolveBackend(request: AiGenerateRequest): Promise<StudioAiBackend> {
    if (request.backendId) {
      const explicit = get(request.backendId);
      if (!explicit) {
        throw new Error(`AI backend not registered: ${request.backendId}`);
      }
      return explicit;
    }

    const preferredKind = request.prefer ?? defaultKind;
    const preferred = getByKind(preferredKind);
    if (preferred) return preferred;

    const fallback = list()[0];
    if (!fallback) {
      throw new Error("No AI backends registered");
    }
    return fallback;
  }

  async function requestAi(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const backend = await resolveBackend(request);
    const ok = await backend.available();
    if (!ok) {
      throw new Error(`${backend.displayName} is not available (${backend.id})`);
    }
    return backend.generate(request);
  }

  return {
    register,
    unregister,
    list,
    get,
    getByKind,
    requestAi,
  };
}

/** Default Ollama backend instance id. */
export const OLLAMA_AI_BACKEND_ID = "ollama:local" as const;

/** MCP backend stub instance id. */
export const MCP_AI_BACKEND_ID = "mcp:local" as const;

/** Cloud backend stub instance id. */
export const CLOUD_AI_BACKEND_ID = "cloud:default" as const;
