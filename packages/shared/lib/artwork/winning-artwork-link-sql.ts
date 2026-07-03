/** SQL fragment — winning album_artwork_links row for an album (matches loadTrackPage). */
export const WINNING_ARTWORK_LINK_ORDER = `
  ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
           aal.confidence_score DESC NULLS LAST,
           aal.updated_at DESC NULLS LAST,
           aal.id DESC
  LIMIT 1
`;

export function winningArtworkPathSubquery(): string {
  return `
    (
      SELECT aal.canonical_cover_path FROM album_artwork_links aal
      WHERE aal.album_id = al.id
      ${WINNING_ARTWORK_LINK_ORDER}
    ) AS artwork_path
  `;
}

export function winningArtworkR2Subquery(): string {
  return `
    (
      SELECT aal.r2_cover_key FROM album_artwork_links aal
      WHERE aal.album_id = al.id
      ${WINNING_ARTWORK_LINK_ORDER}
    ) AS r2_cover_key
  `;
}

export function winningArtworkUpdatedAtSubquery(): string {
  return `
    (
      SELECT aal.updated_at::text FROM album_artwork_links aal
      WHERE aal.album_id = al.id
      ${WINNING_ARTWORK_LINK_ORDER}
    ) AS artwork_updated_at
  `;
}
