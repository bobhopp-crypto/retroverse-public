import "server-only";
import { researchCurrentSong, type Config, type Dependencies, type Result } from "./openai-adapter";

type PublicResult = Omit<Result, "key" | "selectionVersion">;
export type ServiceResponse = { body: PublicResult; status: number; headers: { "Cache-Control": "no-store" } };

/** Server composition seam only. Never construct configuration/dependencies from
 * request input. The service accepts no public prompt, model or identity argument.
 * Activation requires a separately approved trusted state loader, secure transport,
 * shared quota/lease implementation and citation UI. No guessed recording IDs.
 */
export function createSongResearchService(config: Config, dependencies: Dependencies) {
  const fixedConfig = Object.freeze({ ...config });
  const fixedDependencies = Object.freeze({ ...dependencies });
  return async (): Promise<ServiceResponse> => {
    let result: Result;
    try { result = await researchCurrentSong(fixedConfig, fixedDependencies); }
    catch { result = { status: "error" }; }
    // Keep recording keys and playback-selection versions inside the server.
    const body: PublicResult = result.status === "ready"
      ? { status: "ready", selectionToken: result.selectionToken, text: result.text, sources: result.sources, supports: result.supports, attribution: result.attribution }
      : { status: result.status };
    const status = result.status === "ready" ? 200 : result.status === "timeout" ? 504 : result.status === "stale" ? 409 : 503;
    return { body, status, headers: { "Cache-Control": "no-store" } };
  };
}

// Deliberately hard-disabled production composition. No environment reads, model
// default, credentials, network transport, private file access or budget mutations.
// Lazy state module/store initialization remains unreachable while disabled.
export const songResearchService = createSongResearchService(
  { enabled: false, provider: "openai", model: "" },
  { readVerifiedCurrent: async signal => {
    if (signal.aborted) return null;
    const { readRepositoryCurrentSong } = await import("./repository-state");
    return signal.aborted ? null : readRepositoryCurrentSong(signal);
  } },
);
