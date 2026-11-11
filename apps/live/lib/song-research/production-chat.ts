import "server-only";
import { APPROVED_OPENAI_PROJECT_ID } from "./openai-project";
import { createConfiguredSourceChatService } from "./configured-source-chat";
import { CHAT_LIMITS, PROVIDER_PROJECT_BUDGET_PROFILE, chatBudgetFingerprint,
  type ChatBudgetRequest, type ChatBudgetPermit, type OfflineChatResponse, type SourceChatDependencies } from "./offline-chat-service";

export const PROVIDER_LIMIT_POLICY = "default-project-20-usd-lag-accepted";
type EnvironmentName = "RETROVERSE_OPENAI_ENABLED" | "RETROVERSE_OPENAI_PROJECT_ID"
  | "RETROVERSE_OPENAI_BUDGET_POLICY" | "RETROVERSE_OPENAI_API_KEY";
type EnvironmentReader = (name: EnvironmentName) => string | undefined;
const unavailable = (status: "disabled" | "unavailable"): OfflineChatResponse => ({ body: { status }, status: 503, headers: { "Cache-Control": "no-store" } });

/** Server-only runtime composition. Creating/importing it reads NO environment,
 * credential, state or network. Missing configuration stays disabled/unavailable.
 * The owner accepted the provider's $20 Default-project monthly hard limit and its
 * possible enforcement lag. This mode relies on that provider setting, NOT the
 * unprovisioned local monthly ledger, and does not falsely attest durable storage
 * or a complete per-request price bound. The project setting must remain enabled.
 * Key scope/project attribution still require the deployment owner's verification.
 */
export function createProductionChatService(dependencies: {
  environment: EnvironmentReader;
  readVerifiedCurrent: SourceChatDependencies["readVerifiedCurrent"];
  fetch(url: string, init: RequestInit): Promise<Response>;
  now?: () => number;
}) {
  const environment = dependencies.environment, readCurrent = dependencies.readVerifiedCurrent;
  const send = dependencies.fetch, now = dependencies.now ?? Date.now;
  // Small process-local overlap protection, NOT global/monthly money accounting.
  const active = new Map<string, { owner: symbol; expires: number }>();
  const policyEnabled = () => environment("RETROVERSE_OPENAI_ENABLED") === "1"
    && environment("RETROVERSE_OPENAI_PROJECT_ID") === APPROVED_OPENAI_PROJECT_ID
    && environment("RETROVERSE_OPENAI_BUDGET_POLICY") === PROVIDER_LIMIT_POLICY;
  const approve = async (request: ChatBudgetRequest, signal: AbortSignal): Promise<ChatBudgetPermit | null> => {
    const time = now();
    if (signal.aborted || !policyEnabled() || request.profile !== PROVIDER_PROJECT_BUDGET_PROFILE || request.grounding !== "web-search"
      || request.model !== "gpt-6-luna" || request.monthlyLimitMicros !== 20000000
      || request.maxOutputTokens !== 700 || request.maxToolCalls !== 2 || request.maxInputBytes !== CHAT_LIMITS.providerInputBytes
      || request.maxResponseBytes !== CHAT_LIMITS.responseBytes || request.maxSourceBytes !== CHAT_LIMITS.sourceBytes
      || !/^[a-f0-9]{64}$/.test(request.key) || !Number.isFinite(time) || !Number.isSafeInteger(request.deadlineMs)
      || request.deadlineMs <= time || request.deadlineMs > time + CHAT_LIMITS.timeoutMs
      || !Number.isSafeInteger(request.leaseMs) || request.leaseMs < 1 || request.leaseMs > CHAT_LIMITS.timeoutMs) return null;
    for (const [key, value] of active) if (value.expires <= time) active.delete(key);
    if (active.has(request.key) || active.size >= 2) return null;
    const owner = Symbol("request"), expires = request.deadlineMs;
    active.set(request.key, { owner, expires });
    return { profile: PROVIDER_PROJECT_BUDGET_PROFILE, requestFingerprint: chatBudgetFingerprint(request),
      isValid: async checkSignal => !checkSignal.aborted && policyEnabled() && now() < expires && active.get(request.key)?.owner === owner,
      finish: async () => { if (active.get(request.key)?.owner === owner) active.delete(request.key); },
    };
  };
  return async (raw: string, options: { signal?: AbortSignal } = {}): Promise<OfflineChatResponse> => {
    try {
      if (environment("RETROVERSE_OPENAI_ENABLED") !== "1") return unavailable("disabled");
      if (!policyEnabled()) return unavailable("unavailable");
      const run = createConfiguredSourceChatService({ enabled: true, grounding: "web-search",
        providerProjectLimit: { projectId: APPROVED_OPENAI_PROJECT_ID, monthlyUsd: 20, enforcementLagAccepted: true } }, {
        projectId: APPROVED_OPENAI_PROJECT_ID, now, readVerifiedCurrent: readCurrent, approveChatMonthly: approve,
        loadCredential: async signal => {
          if (signal.aborted || !policyEnabled()) throw Error("Research unavailable");
          // Exact approved server-only name. No fallback to OPENAI_API_KEY, save,
          // logging, enumeration or public serialization of this value.
          const value = environment("RETROVERSE_OPENAI_API_KEY");
          if (typeof value !== "string" || !value || value.length > 4096 || /\s/.test(value)) throw Error("Research unavailable");
          return value;
        },
        fetch: async (url, init) => {
          if (init.signal?.aborted || !policyEnabled()) throw Error("Research unavailable");
          return send(url, init);
        },
      });
      return run(raw, options);
    } catch { return unavailable("unavailable"); }
  };
}

// Lazy runtime callbacks only. This module never opens a local media application.
export const productionChatService = createProductionChatService({
  environment: name => process.env[name],
  readVerifiedCurrent: async signal => {
    if (signal.aborted) return null;
    const { readRepositoryCurrentSong } = await import("./repository-state");
    return signal.aborted ? null : readRepositoryCurrentSong(signal);
  },
  fetch: (url, init) => fetch(url, init),
});
