import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

const RE_RVAL = /^RVAL\d{6}$/i;

/** Resolve a public `/album/[id]` param to a canonical RVAL when possible. */
export async function resolveAlbumRvalParam(idParam: string): Promise<string | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const raw = decodeURIComponent(idParam).trim();
  if (!raw) return null;
  if (RE_RVAL.test(raw)) return raw.toUpperCase();

  const slugNeedle = raw.toLowerCase();
  const titleNeedle = raw.replace(/-/g, " ").trim();

  const rows = await inspectQuery<{ external_key: string }>(
    `
    SELECT aek.external_key
    FROM albums al
    JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE lower(regexp_replace(regexp_replace(trim(al.title), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
            = lower(regexp_replace(regexp_replace(trim($1), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
       OR lower(trim(al.title)) = lower(trim($2))
       OR al.title ILIKE $3
    ORDER BY
      CASE
        WHEN lower(trim(al.title)) = lower(trim($2)) THEN 0
        WHEN lower(regexp_replace(regexp_replace(trim(al.title), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')) = $4 THEN 1
        ELSE 2
      END,
      length(al.title),
      al.title
    LIMIT 1
    `,
    [slugNeedle, titleNeedle, titleNeedle, slugNeedle],
  );

  const key = rows[0]?.external_key?.trim().toUpperCase();
  return key && RE_RVAL.test(key) ? key : null;
}
