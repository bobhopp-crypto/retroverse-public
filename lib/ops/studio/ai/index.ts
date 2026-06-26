/**
 * Retroverse Studio — AI backend adapters (thin ops layer over kernel registry).
 */

export {
  getStudioAiBackendRegistry,
  resetStudioAiBackendRegistryForTests,
  createOllamaAiBackend,
  createMcpAiBackendStub,
  createCloudAiBackendStub,
} from "./registry";
