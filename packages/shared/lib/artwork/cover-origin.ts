/**
 * Public cover delivery origin.
 * DB paths are relative (retroverse/covers/RVAL…/file.jpg); this is the CDN that serves them.
 * Override via NEXT_PUBLIC_RETROVERSE_COVER_BASE_URL or RETROVERSE_COVER_BASE_URL.
 */
export const RETROVERSE_PUBLIC_COVER_CDN =
  "https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev";

/** Env-configured origin when set; otherwise the public R2 CDN (never a dead relative path). */
export function getPublicCoverDeliveryBase(): string {
  for (const raw of [
    process.env.NEXT_PUBLIC_RETROVERSE_COVER_BASE_URL,
    process.env.RETROVERSE_COVER_BASE_URL,
  ]) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '""' || trimmed === "''") continue;
    const base = trimmed.replace(/\/+$/, "").replace(/\/retroverse\/covers$/i, "").replace(/\/+$/, "");
    if (base.startsWith("http://") || base.startsWith("https://")) return base;
  }
  return RETROVERSE_PUBLIC_COVER_CDN;
}
