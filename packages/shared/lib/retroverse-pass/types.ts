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

/** Public credentials are opaque. Trimming is the only normalization allowed. */
export function parsePassCredential(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const credential = raw.trim();
  if (!credential || credential.length > 100 || credential.includes("\0")) return null;
  return credential;
}
