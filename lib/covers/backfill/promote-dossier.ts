import { inspectExecute } from "@/lib/inspect/pg";
import { localWebPathFromRel } from "@/lib/covers/backfill/dossier-path";

export async function promoteDossierCoverToPg(input: {
  albumId: number;
  rval: string;
  canonicalCoverPath: string;
}): Promise<void> {
  const path = input.canonicalCoverPath.trim().replace(/^\/+/, "");
  const localPath = localWebPathFromRel(path);
  const r2Key = path;

  await inspectExecute(
    `
    INSERT INTO album_artwork_links (
      album_id,
      album_edition_id,
      canonical_cover_path,
      local_cover_path,
      r2_cover_key,
      source,
      confidence_score,
      review_flag
    )
    VALUES ($1, NULL, $2, $3, $4, 'dossier', 85, 'ok')
    ON CONFLICT (album_id, coalesce(album_edition_id, 0), source)
    DO UPDATE SET
      canonical_cover_path = EXCLUDED.canonical_cover_path,
      local_cover_path = EXCLUDED.local_cover_path,
      r2_cover_key = EXCLUDED.r2_cover_key,
      confidence_score = EXCLUDED.confidence_score,
      review_flag = EXCLUDED.review_flag,
      updated_at = now()
    `,
    [input.albumId, path, localPath, r2Key],
  );

  await inspectExecute(
    `
    UPDATE albums
    SET canonical_cover_path = $2
    WHERE id = $1
      AND coalesce(nullif(trim(canonical_cover_path), ''), '') = ''
    `,
    [input.albumId, path],
  );

  await inspectExecute(
    `
    INSERT INTO staging_album_artwork_link_buffer (
      album_id, album_edition_id, canonical_cover_path, local_cover_path,
      r2_cover_key, source, confidence_score, review_flag
    )
    VALUES ($1, '', $2, $3, $4, 'dossier', '85', 'ok')
    `,
    [String(input.albumId), path, localPath, r2Key],
  );
}
