import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";

/** Plain-text secondary line — no parsing, formatting, or year validation. */
export function parseSecondaryLine(raw: unknown, fallback = CONTENT_CREATOR_DEFAULTS.secondaryLine): string {
  if (typeof raw === "string") return raw;
  return fallback;
}

/** Accept secondaryLine string or legacy featuredYears number array from older clients. */
export function parseSecondaryLineWithLegacy(
  body: Record<string, unknown>,
  keys: { line?: string; legacyYears?: string } = {},
): string {
  const lineKey = keys.line ?? "secondaryLine";
  const legacyKey = keys.legacyYears ?? "featuredYears";
  if (typeof body[lineKey] === "string") return body[lineKey] as string;
  if (Array.isArray(body[legacyKey])) {
    return (body[legacyKey] as unknown[])
      .map((y) => (typeof y === "number" ? String(y) : typeof y === "string" ? y : ""))
      .filter(Boolean)
      .join(" · ");
  }
  return CONTENT_CREATOR_DEFAULTS.secondaryLine;
}
