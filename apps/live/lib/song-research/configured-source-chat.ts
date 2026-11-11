import "server-only";
import { isApprovedOpenAIProject } from "./openai-project";
import { createSourceChatService, type SourceChatConfig, type SourceChatDependencies } from "./offline-chat-service";
import { createSourceTurnAdapter, type SourceAdapterDependencies } from "./one-shot-source-adapter";
import { createOpenAIWebChatTransport } from "./openai-transport";
import { reviewedSourceResolver } from "./reviewed-source-resolver";

/** Minimal real-provider composition, OFF by default and without actual secrets,
 * environment reads, global fetch, storage provisioning or automatic activation.
 * Supply only separately approved server dependencies. The current generic monthly
 * gate is NOT a chat-profile approval: a reviewed matching $20 guard is required.
 * Empty/unverified source coverage is not an arbitrary-song research resolver.
 */
export function createConfiguredSourceChatService(config: {
  enabled?: boolean; grounding?: SourceChatConfig["grounding"]; budgetAssurance?: SourceChatConfig["budgetAssurance"]; providerProjectLimit?: SourceChatConfig["providerProjectLimit"];
} = {}, dependencies: {
  projectId?: string;
  readVerifiedCurrent?: SourceChatDependencies["readVerifiedCurrent"];
  resolveSources?: SourceChatDependencies["retrieveSources"];
  approveChatMonthly?: SourceChatDependencies["approveShared"];
  loadCredential?: SourceAdapterDependencies["loadCredential"];
  fetch?: SourceAdapterDependencies["fetch"];
  now?: () => number;
} = {}) {
  const loadCredential = dependencies.loadCredential, fetchResponse = dependencies.fetch, projectId = dependencies.projectId;
  const grounding = config.grounding ?? "provided-sources";
  return createSourceChatService({ enabled: config.enabled === true, provider: "openai", model: "gpt-6-luna",
    budgetAssurance: config.budgetAssurance, providerProjectLimit: config.providerProjectLimit, grounding }, {
    readVerifiedCurrent: dependencies.readVerifiedCurrent ?? (async () => null),
    retrieveSources: dependencies.resolveSources ?? reviewedSourceResolver,
    approveShared: dependencies.approveChatMonthly, now: dependencies.now,
    providerTransport: isApprovedOpenAIProject(projectId) && loadCredential && fetchResponse ? async (request, signal, privateIdentifiers) => {
      // Fresh adapter permits one call for this separately budgeted turn. Neither
      // factory construction nor the disabled endpoint reads a credential.
      if (grounding === "web-search") {
        // A different search-inclusive budget profile is mandatory in the engine.
        const search = createOpenAIWebChatTransport({ projectId, loadCredential, fetch: fetchResponse, privateIdentifiers });
        return JSON.stringify(await search(request, signal)) ?? "null";
      }
      const turn = createSourceTurnAdapter({ projectId, loadCredential, fetch: fetchResponse, privateIdentifiers }, { enabled: true });
      return turn(request, signal);
    } : undefined,
  });
}
