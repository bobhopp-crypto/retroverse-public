/**
 * Booth session authority lock (Sprint 8).
 * While The Booth owns The Air, legacy writers must reject clearly — never
 * silently accept and get overwritten later.
 *
 * This module stays isomorphic (no top-level server-only imports) so clients
 * can display BoothAuthorityError messages.
 */

export const BOOTH_ACTIVE_REJECTION =
  "The Booth owns The Air — legacy transport rejected while Booth session is active";

export class BoothAuthorityError extends Error {
  readonly code = "BOOTH_SESSION_ACTIVE" as const;

  constructor(message: string = BOOTH_ACTIVE_REJECTION) {
    super(message);
    this.name = "BoothAuthorityError";
  }
}

/** True when The Booth has an active on-air session. */
export async function isBoothSessionActive(): Promise<boolean> {
  const { loadBroadcastSnapshot } = await import("./broadcast-snapshot");
  const snapshot = await loadBroadcastSnapshot();
  if (snapshot?.boothPublisher?.sessionActive === true) return true;

  const { loadPresentationState } = await import("./store");
  const state = await loadPresentationState();
  return state.boothPublisher?.sessionActive === true;
}

/**
 * Call from legacy surfaces (Presentation Studio, Mixer, VDJ auto-follow).
 * Throws BoothAuthorityError when Booth owns The Air.
 */
export async function assertBoothLegacyMutationAllowed(): Promise<void> {
  if (await isBoothSessionActive()) {
    throw new BoothAuthorityError();
  }
}
