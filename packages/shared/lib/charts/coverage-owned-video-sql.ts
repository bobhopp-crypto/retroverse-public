import { opsVideoMediaAndClause } from "@/lib/ops/ops-video-media";

/**
 * Canonical VIDEO-folder ownership for coverage (never MUSIC audio).
 * Shared by chart week loader and RVTR batch coverage.
 */
export function coverageVideoMediaAndClause(alias = "ma"): string {
  return opsVideoMediaAndClause(alias);
}

/** EXISTS: graph track row has a linked file under DJ MEDIA/VIDEO (not MUSIC). */
export function coverageOwnedVideoByGraphTrackIdSql(
  graphTrackIdExpr: string,
  options?: { mtlAlias?: string; maAlias?: string },
): string {
  const mtl = options?.mtlAlias ?? "mtl_cov";
  const ma = options?.maAlias ?? "ma_cov";
  const video = coverageVideoMediaAndClause(ma);
  return `
    EXISTS (
      SELECT 1
      FROM media_track_links ${mtl}
      JOIN media_assets ${ma} ON ${ma}.id = ${mtl}.media_asset_id
      WHERE ${mtl}.track_id = ${graphTrackIdExpr}
      ${video}
    )
  `;
}

/** EXISTS: RVTR resolves to a graph track with VIDEO-folder ownership. */
export function coverageOwnedVideoByRvtrSql(rvtrExpr: string): string {
  const video = coverageVideoMediaAndClause("ma_cov");
  return `
    EXISTS (
      SELECT 1
      FROM canonical_track_display ctd_cov
      JOIN canonical_track_versions ctv_cov
        ON ctv_cov.canonical_track_id = ctd_cov.id AND ctv_cov.is_primary IS TRUE
      JOIN media_track_links mtl_cov ON mtl_cov.track_id = ctv_cov.graph_track_id
      JOIN media_assets ma_cov ON ma_cov.id = mtl_cov.media_asset_id
      WHERE upper(trim(coalesce(ctd_cov.retroverse_track_id, ctd_cov.track_id))) = upper(trim(${rvtrExpr}))
      ${video}
    )
  `;
}
