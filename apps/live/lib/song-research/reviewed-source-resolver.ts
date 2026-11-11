import "server-only";
import type { MockSourceRequest } from "./offline-chat-service";

export type ReviewedSourceEntry = {
  recordingIdentity: string;
  context: { title: string; artist: string; year: number | null };
  reviewedPublicSources: true;
  sources: { id: string; title: string; url: string; excerpt: string }[];
};
/** Trusted server-internal manifest only, never client input or a web query.
 * The review flag records an actual source/recording review; it cannot prove one.
 * Excerpts must come from the linked source, not old generated answers. Match the
 * exact server-held recording/context; never infer it from title similarity.
 * Private IDs stay here. No file/credential lookup, search, or external transport.
 */
export function createReviewedSourceResolver(entries: readonly ReviewedSourceEntry[]) {
  const snapshot = entries.map(entry => ({ ...entry, context: { ...entry.context }, sources: entry.sources.map(source => ({ ...source })) }));
  return async (request: MockSourceRequest, signal: AbortSignal): Promise<string> => {
    const unavailable = JSON.stringify({ status: "unavailable" });
    if (signal.aborted) return unavailable;
    const matching = snapshot.filter(entry => entry.recordingIdentity === request.trustedRecordingIdentity);
    if (matching.length !== 1) return unavailable;
    const entry = matching[0];
    if (entry.reviewedPublicSources !== true || entry.context.title !== request.context.title
      || entry.context.artist !== request.context.artist || entry.context.year !== request.context.year
      || !entry.sources.length) return unavailable;
    // The service validates bounds, URLs, privacy and exact evidence quotations.
    return JSON.stringify({ status: "ready", requestId: request.requestId,
      selectionToken: request.selectionToken, recordingIdentity: entry.recordingIdentity,
      recordingAmbiguous: false, sources: entry.sources });
  };
}

// No real sources have been verified and installed for this candidate yet.
// An empty manifest is deliberate: never substitute demo text or invent excerpts.
export const reviewedSourceResolver = createReviewedSourceResolver([]);
