/** Ops reconciliation: playable VDJ VIDEO only (not /MUSIC/ audio). */

export const OPS_VIDEO_EXTENSIONS = ["mp4", "mkv", "mov", "avi", "m4v"] as const;

export function opsVideoExtensionSqlList(): string {
  return OPS_VIDEO_EXTENSIONS.map((e) => `'${e}'`).join(", ");
}

/**
 * SQL `AND …` predicates for `media_assets` rows used by /ops matching.
 * Requires `/VIDEO/` in path, video extension, and excludes MUSIC + VIDEO VAULT.
 */
export function opsVideoMediaAndClause(alias = "ma"): string {
  const extList = opsVideoExtensionSqlList();
  const a = alias;
  const path = `coalesce(${a}.source_path, ${a}.directory_path, '')`;
  return `
    AND ${path} ILIKE '%/VIDEO/%'
    AND ${path} NOT ILIKE '%/MUSIC/%'
    AND ${path} NOT ILIKE '%/VIDEO VAULT/%'
    AND (
      lower(coalesce(${a}.file_extension, '')) IN (${extList})
      OR lower(coalesce(${a}.filename, '')) ~ '\\.(mp4|mkv|mov|avi|m4v)$'
    )
  `;
}

export function isOpsPlayableVideoPath(path: string | null | undefined): boolean {
  if (!path?.trim()) return false;
  const p = path.trim();
  if (!/\/VIDEO\//i.test(p)) return false;
  if (/\/MUSIC\//i.test(p)) return false;
  if (/\/VIDEO VAULT\//i.test(p)) return false;
  return /\.(mp4|mkv|mov|avi|m4v)$/i.test(p);
}

export async function assertOpsVideoMediaId(
  mediaId: number,
): Promise<boolean> {
  const { inspectQuery } = await import("@/lib/inspect/pg");
  const rows = await inspectQuery<{ ok: number }>(
    `
    SELECT 1::int AS ok
    FROM media_assets ma
    WHERE ma.id = $1
    ${opsVideoMediaAndClause("ma")}
    LIMIT 1
    `,
    [mediaId],
  );
  return rows.length > 0;
}
