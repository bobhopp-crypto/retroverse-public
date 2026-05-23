/** Strip characters unsafe in ILIKE patterns; never concatenate raw SQL. */
export function sanitizeInspectQuery(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, " ").replace(/\s+/g, " ").slice(0, 120);
}
