/**
 * Retroverse Pass Experience v1.
 *
 * A serialized pass (RVSN#####) is a permanent Retroverse identity.
 * First scan → claim overlay (first name, email, optional phone).
 * Later scans → recognized immediately, welcomed back.
 *
 * No passwords, no accounts, no login. Pass + visitor + activity log only.
 */

export type RetroverseVisitor = {
  id: number;
  firstName: string;
  email: string;
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

const SERIAL_PATTERN = /^RVSN\d{5}$/;

/** Normalize a scanned serial — "rvsn00427" → "RVSN00427". Null if invalid. */
export function normalizePassSerial(raw: string): string | null {
  const serial = raw.trim().toUpperCase();
  return SERIAL_PATTERN.test(serial) ? serial : null;
}

/** "RVSN00427" → "427" for friendly display ("Pass #427"). */
export function passDisplayNumber(serial: string): string {
  const digits = serial.replace(/^RVSN/, "");
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? String(n) : digits;
}
