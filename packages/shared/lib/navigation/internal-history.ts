export const RETROVERSE_HISTORY_EVENT = "retroverse:internal-history";

const HISTORY_STATE_KEY = "__retroverseInternalEntry";
const SESSION_STATE_KEY = "retroverse:internal-history:current";

type InternalHistoryEntry = {
  id: string;
  href: string;
  previousId: string | null;
};

type StoredInternalEntry = Pick<InternalHistoryEntry, "id" | "href">;

function isInternalHistoryEntry(value: unknown): value is InternalHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<InternalHistoryEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.href === "string" &&
    (entry.previousId === null || typeof entry.previousId === "string")
  );
}

export function readCurrentInternalEntry(): InternalHistoryEntry | null {
  if (typeof window === "undefined") return null;
  const state = window.history.state as Record<string, unknown> | null;
  const entry = state?.[HISTORY_STATE_KEY];
  return isInternalHistoryEntry(entry) ? entry : null;
}

export function readStoredInternalEntry(): StoredInternalEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STATE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<StoredInternalEntry>;
    if (typeof entry.id !== "string" || typeof entry.href !== "string") return null;
    return { id: entry.id, href: entry.href };
  } catch {
    return null;
  }
}

function storeInternalEntry(entry: InternalHistoryEntry): void {
  try {
    window.sessionStorage.setItem(
      SESSION_STATE_KEY,
      JSON.stringify({ id: entry.id, href: entry.href } satisfies StoredInternalEntry),
    );
  } catch {
    // History behavior must still work when storage is unavailable.
  }
}

function entryId(): string {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function markCurrentInternalEntry(
  href: string,
  previousId: string | null,
): InternalHistoryEntry {
  const current = readCurrentInternalEntry();
  if (current?.href === href) {
    storeInternalEntry(current);
    return current;
  }

  const entry: InternalHistoryEntry = {
    id: entryId(),
    href,
    previousId,
  };
  const currentState = window.history.state;
  const nextState =
    currentState && typeof currentState === "object"
      ? { ...currentState, [HISTORY_STATE_KEY]: entry }
      : { [HISTORY_STATE_KEY]: entry };

  window.history.replaceState(nextState, "", window.location.href);
  storeInternalEntry(entry);
  window.dispatchEvent(new Event(RETROVERSE_HISTORY_EVENT));
  return entry;
}

export function hasInternalBackEntry(): boolean {
  return readCurrentInternalEntry()?.previousId != null;
}

