import { inspectQuery } from "@/lib/inspect/pg";

/** Verify promotion by RVAL only — no artist/title matching. */
export async function verifyCoverPromotedByRval(rval: string): Promise<{
  ok: boolean;
  canonicalCoverPath: string | null;
}> {
  const id = rval.trim().toUpperCase();
  const rows = await inspectQuery<{ canonical_cover_path: string | null }>(
    `
    SELECT nullif(trim(al.canonical_cover_path), '') AS canonical_cover_path
    FROM albums al
    JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE upper(trim(aek.external_key)) = $1
    LIMIT 1
    `,
    [id],
  );
  const path = rows[0]?.canonical_cover_path ?? null;
  if (!path) return { ok: false, canonicalCoverPath: null };
  if (!path.toUpperCase().includes(id)) {
    return { ok: false, canonicalCoverPath: path };
  }
  return { ok: true, canonicalCoverPath: path };
}
