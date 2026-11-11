import { createHash } from "node:crypto";

/** Public playback correlation only, never a recording identifier or credential.
 * Both callers use raw bridge identity BEFORE display/catalog year enrichment.
 * A private media swap with an unchanged public tuple is not observable here;
 * the adapter must separately revalidate its private recording/selection key.
 */
export function songResearchSelectionToken(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const live = value as Record<string, unknown>;
  const field = (v: unknown, max = 200): v is string => typeof v === "string" && !!v.trim() && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
  if (!field(live.title) || !field(live.artist) || !field(live.startedAt, 80) || !Number.isFinite(Date.parse(live.startedAt)) || typeof live.rvtr !== "string" || !/^RVTR\d{6}$/i.test(live.rvtr)) return null;
  const year = live.vdjYear ?? live.year ?? null;
  if (year !== null && (typeof year !== "number" || !Number.isInteger(year) || year < 1800 || year > 2100)) return null;
  return createHash("sha256").update(JSON.stringify(["retroverse-public-research-selection-v1", live.rvtr.toUpperCase(), live.title, live.artist, year, live.startedAt])).digest("hex");
}
