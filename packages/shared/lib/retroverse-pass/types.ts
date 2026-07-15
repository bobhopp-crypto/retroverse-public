/**
 * Retroverse Pass Experience v1.
 *
 * A serialized pass (RVSN#####) is a permanent Retroverse identity.
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
  createdAt: string;
};

export type RetroversePass = {
  serial: string;
  claimed: boolean;
  visitorId: number | null;
  claimedAt: string | null;
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

/** Public credentials are opaque. Trimming is the only normalization allowed. */
export function parsePassCredential(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const credential = raw.trim();
  if (!credential || credential.length > 100 || credential.includes("\0")) return null;
  return credential;
}

/**
 * A well-formed credential can still fail to look like a real Retroverse
 * pass serial (e.g. a stray link, a typo, someone else's QR code). Issued
 * serials are `RVSN` followed by 3–8 digits. This gate runs after
 * `parsePassCredential` and before any database lookup or provisioning —
 * it never mutates data, it only decides whether to offer the registration
 * flow at all.
 */
const PASS_SERIAL_FORMAT = /^RVSN\d{3,8}$/i;

export function isPlausiblePassSerial(credential: string): boolean {
  return PASS_SERIAL_FORMAT.test(credential);
}

/**
 * Canonical uppercase form of a plausible serial, or null if it doesn't
 * look like a real pass. Scanning, claiming, and editing all resolve
 * through this so `rvsn00427` and `RVSN00427` are always the same pass —
 * otherwise mismatched case could silently provision duplicate rows.
 */
export function normalizePassSerial(raw: unknown): string | null {
  const credential = parsePassCredential(raw);
  if (!credential || !isPlausiblePassSerial(credential)) return null;
  return credential.toUpperCase();
}
