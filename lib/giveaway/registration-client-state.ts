const STORAGE_PREFIX = "retroverse-giveaway";

export function giveawayRegisteredStorageKey(eventKey: string, giveawayId: string): string {
  return `${STORAGE_PREFIX}:${eventKey}:${giveawayId}`;
}

export function markGiveawayRegistered(eventKey: string, giveawayId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(giveawayRegisteredStorageKey(eventKey, giveawayId), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function isGiveawayRegistered(eventKey: string, giveawayId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(giveawayRegisteredStorageKey(eventKey, giveawayId)) === "1";
  } catch {
    return false;
  }
}
