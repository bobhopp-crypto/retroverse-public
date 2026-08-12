/**
 * Retroverse Pass Experience v1.
 *
 * A pass identifier is an opaque string defined by the QR / URL.
 * First scan → registration form (first name required, email/phone optional).
 * Later scans → recognized immediately, told the pass is already registered.
 *
 * No passwords, no accounts, no login. Pass + visitor + activity log only.
 */

export type RetroverseVisitor = {
  id: number;
  firstName: string;
  email: string | null;
  phone: string | null;
  lastName?: string | null;
  birthday?: string | null;
  postalCode?: string | null;
  marketingOptIn?: boolean;
  notes?: string | null;
  createdAt: string;
};

export type RetroversePass = {
  serial: string;
  claimed: boolean;
  visitorId: number | null;
  claimedAt: string | null;
  status?: "never_registered" | "registered" | "checked_in" | "disabled";
};

/** Recorded actions only — never inferred behavior. */
export const PASS_ACTIVITY_EVENT_TYPES = [
  "PASS_CLAIMED",
  "PASS_SCANNED",
  "PASS_EDITED",
  "SEARCH",
  "OPEN_ARTIST",
  "OPEN_SONG",
  "OPEN_EVENT",
] as const;

export type PassActivityEventType = (typeof PASS_ACTIVITY_EVENT_TYPES)[number];

export type PassActivity = {
  id: number;
  visitorId: number | null;
  passSerial: string | null;
  eventType: PassActivityEventType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

/** What the /pass/[serial] page needs to decide which overlay to show. */
export type PassScanResult =
  | { state: "unclaimed"; pass: RetroversePass }
  | { state: "claimed"; pass: RetroversePass; visitor: RetroverseVisitor };

const MAX_PASS_IDENTIFIER_LENGTH = 100;

/**
 * Public credentials are opaque. Trim only; reject empty / unsafe path values.
 * No business-format rules (RVSN prefix, length, numeric shape, etc.).
 */
export function parsePassCredential(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const credential = raw.trim();
  if (!credential || credential.length > MAX_PASS_IDENTIFIER_LENGTH) return null;
  // Path traversal / URL delimiters / control chars only.
  if (
    credential.includes("/") ||
    credential.includes("\\") ||
    credential.includes("?") ||
    credential.includes("#") ||
    /[\x00-\x1f\x7f]/.test(credential)
  ) {
    return null;
  }
  return credential;
}

/** @deprecated Prefer parsePassCredential — kept for callers that used the old name. */
export function isPlausiblePassSerial(credential: string): boolean {
  return parsePassCredential(credential) !== null;
}

/**
 * Resolve a pass identifier for scan / claim / edit.
 * Identity is exact after trim — the QR string is the identifier.
 */
export function normalizePassSerial(raw: unknown): string | null {
  return parsePassCredential(raw);
}
