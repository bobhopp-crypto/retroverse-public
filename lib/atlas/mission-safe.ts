/** Null-safe string helpers for atlas mission loaders. */

export function normRvtrId(rvtr: string | null | undefined): string | null {
  const id = rvtr?.trim().toUpperCase() ?? "";
  return id.length > 0 ? id : null;
}

export function normText(value: string | null | undefined, fallback = ""): string {
  return value?.trim() ?? fallback;
}

export function normArtistKey(name: string | null | undefined): string {
  return normText(name).toLowerCase();
}

const MISSION_NULL_LOG_RVTR = "RVTR097615";

/** Dev diagnostic — logs null enrichment fields for a target RVTR audit row. */
export function logMissionNullFields(
  rvtr: string,
  row: Record<string, unknown>,
  source: string,
): void {
  if (normRvtrId(rvtr) !== MISSION_NULL_LOG_RVTR) return;

  const fields = [
    "rvtr",
    "artist",
    "title",
    "path",
    "mediaId",
    "performanceYear",
    "peakHot100",
    "playCount",
    "chartScore",
    "albumScore",
    "coverScore",
    "commentaryScore",
    "tvLinkage",
    "movieLinkage",
    "canonicalTags",
    "classification",
    "tagSource",
  ] as const;

  for (const field of fields) {
    const value = row[field];
    if (value == null) {
      console.warn(
        `[atlas-mission] ${MISSION_NULL_LOG_RVTR} null field "${field}" from ${source} (value=${String(value)})`,
      );
    }
  }
}

export function logMissionNullSkip(
  context: string,
  field: string,
  value: unknown,
): void {
  console.warn(
    `[atlas-mission] skipped ${context}: ${field} is null (value=${String(value)})`,
  );
}
