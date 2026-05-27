import "server-only";

import { revalidatePath } from "next/cache";

import { slugFromArtistName } from "@/lib/artist/slug";
import { inspectQuery } from "@/lib/inspect/pg";

/** Revalidate public pages affected by a single album-link healing write. */
export async function revalidateHealingEntities(
  rvtr: string,
  albumId: number,
): Promise<{ track: string; album: string | null; artist: string | null }> {
  const trackPath = `/track/${rvtr.trim().toUpperCase()}`;
  revalidatePath(trackPath);

  const rows = await inspectQuery<{
    canonical_artist_name: string;
    rval: string | null;
  }>(
    `
    SELECT ctd.canonical_artist_name, aek.external_key AS rval
    FROM canonical_track_display ctd
    LEFT JOIN album_external_keys aek ON aek.album_id = $2
    WHERE upper(trim(ctd.track_id)) = upper(trim($1))
    LIMIT 1
    `,
    [rvtr, albumId],
  );
  const row = rows[0];

  let albumPath: string | null = null;
  const rval = row?.rval?.trim().toUpperCase();
  if (rval) {
    albumPath = `/album/${rval}`;
    revalidatePath(albumPath);
  }

  let artistPath: string | null = null;
  if (row?.canonical_artist_name?.trim()) {
    const slug = slugFromArtistName(row.canonical_artist_name.trim());
    artistPath = `/artist/${slug}`;
    revalidatePath(artistPath);
  }

  return { track: trackPath, album: albumPath, artist: artistPath };
}
