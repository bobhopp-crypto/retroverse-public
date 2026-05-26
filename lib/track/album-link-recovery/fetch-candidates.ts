import { inspectQuery } from "@/lib/inspect/pg";
import { normalizeTrackTitleKey } from "@/lib/track/album-link-recovery/normalize-title";
import type {
  AlbumLinkCandidate,
  CandidateSourceKind,
} from "@/lib/track/album-link-recovery/types";

type TrackRow = {
  track_id: string;
  canonical_title: string;
  canonical_artist_name: string;
  artist_id: number | null;
  first_chart_date: string | null;
  track_family_id: number | null;
};

type CandidateRow = {
  album_id: number;
  album_title: string;
  artist_name: string;
  release_year: number | null;
  source_kind: string;
  track_position: number | null;
  sequence_title: string | null;
  has_canonical_cover: boolean;
  artwork_link_count: number;
  existing_rvtr_on_slot: string | null;
};

function rowToCandidate(row: CandidateRow): AlbumLinkCandidate {
  return {
    albumId: row.album_id,
    albumTitle: row.album_title.trim(),
    artistName: row.artist_name.trim(),
    releaseYear: row.release_year,
    sourceKind: row.source_kind as CandidateSourceKind,
    trackPosition: row.track_position,
    sequenceTitle: row.sequence_title?.trim() ?? null,
    hasCanonicalCover: row.has_canonical_cover,
    artworkLinkCount: Number(row.artwork_link_count) || 0,
    existingRvtrOnSlot: row.existing_rvtr_on_slot?.trim().toUpperCase() ?? null,
  };
}

export async function loadTrackForRecovery(
  rvtr: string,
): Promise<TrackRow | null> {
  const rows = await inspectQuery<TrackRow>(
    `
    SELECT track_id, canonical_title, canonical_artist_name, artist_id,
      first_chart_date::text AS first_chart_date, track_family_id
    FROM canonical_track_display
    WHERE upper(trim(track_id)) = upper(trim($1))
    LIMIT 1
    `,
    [rvtr],
  );
  return rows[0] ?? null;
}

export async function countExistingAlbumLinks(rvtr: string): Promise<number> {
  const rows = await inspectQuery<{ c: number }>(
    `
    SELECT count(*)::int AS c
    FROM canonical_album_tracks cat
    WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
    `,
    [rvtr],
  );
  return rows[0]?.c ?? 0;
}

/** Pull ranked raw candidates — scoring happens in audit-track. */
export async function fetchAlbumLinkCandidates(
  track: TrackRow,
): Promise<AlbumLinkCandidate[]> {
  const rvtr = track.track_id.trim().toUpperCase();
  const titleKey = normalizeTrackTitleKey(track.canonical_title);
  const artistId = track.artist_id;

  const byMap = new Map<number, AlbumLinkCandidate>();

  function merge(rows: CandidateRow[]) {
    for (const row of rows) {
      const c = rowToCandidate(row);
      const prev = byMap.get(c.albumId);
      if (!prev || c.sourceKind === "tracklist_title_unlinked") {
        byMap.set(c.albumId, c);
      }
    }
  }

  if (artistId != null) {
    merge(
      await inspectQuery<CandidateRow>(
        `
        SELECT al.id AS album_id, al.title AS album_title, ar.canonical_name AS artist_name,
          al.release_year,
          'same_artist_album'::text AS source_kind,
          NULL::int AS track_position,
          NULL::text AS sequence_title,
          (al.canonical_cover_path IS NOT NULL AND trim(al.canonical_cover_path) <> '') AS has_canonical_cover,
          (SELECT count(*)::int FROM album_artwork_links aal WHERE aal.album_id = al.id) AS artwork_link_count,
          NULL::text AS existing_rvtr_on_slot
        FROM albums al
        JOIN artists ar ON ar.id = al.artist_id
        WHERE al.artist_id = $1
        ORDER BY al.release_year DESC NULLS LAST, al.title
        LIMIT 12
        `,
        [artistId],
      ),
    );
  }

  merge(
    await inspectQuery<CandidateRow>(
      `
      SELECT al.id AS album_id, al.title AS album_title, ar.canonical_name AS artist_name,
        al.release_year,
        CASE
          WHEN cat.canonical_track_key IS NULL OR trim(cat.canonical_track_key) = ''
          THEN 'tracklist_title_unlinked'
          ELSE 'tracklist_title_match'
        END AS source_kind,
        cat.position AS track_position,
        cat.title AS sequence_title,
        (al.canonical_cover_path IS NOT NULL AND trim(al.canonical_cover_path) <> '') AS has_canonical_cover,
        (SELECT count(*)::int FROM album_artwork_links aal WHERE aal.album_id = al.id) AS artwork_link_count,
        upper(trim(cat.canonical_track_key)) AS existing_rvtr_on_slot
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      JOIN artists ar ON ar.id = al.artist_id
      WHERE lower(regexp_replace(trim(cat.title), '[^a-z0-9]+', ' ', 'g'))
            = lower(regexp_replace(trim($2), '[^a-z0-9]+', ' ', 'g'))
         OR cat.title ILIKE $3
      ORDER BY
        (CASE WHEN $1::bigint IS NOT NULL AND ar.id = $1 THEN 1 ELSE 0 END) DESC,
        al.release_year ASC NULLS LAST
      LIMIT 24
      `,
      [artistId, track.canonical_title, `%${track.canonical_title.trim()}%`],
    ),
  );

  if (track.track_family_id != null) {
    merge(
      await inspectQuery<CandidateRow>(
        `
        SELECT al.id AS album_id, al.title AS album_title, ar.canonical_name AS artist_name,
          al.release_year,
          'track_family_link'::text AS source_kind,
          ctal.track_number AS track_position,
          NULL::text AS sequence_title,
          (al.canonical_cover_path IS NOT NULL AND trim(al.canonical_cover_path) <> '') AS has_canonical_cover,
          (SELECT count(*)::int FROM album_artwork_links aal WHERE aal.album_id = al.id) AS artwork_link_count,
          NULL::text AS existing_rvtr_on_slot
        FROM canonical_track_album_links ctal
        JOIN albums al ON al.id = ctal.album_id
        JOIN artists ar ON ar.id = al.artist_id
        WHERE ctal.track_family_id = $1
        LIMIT 8
        `,
        [track.track_family_id],
      ),
    );
  }

  if (titleKey.length >= 4) {
    merge(
      await inspectQuery<CandidateRow>(
        `
        SELECT al.id AS album_id, al.title AS album_title, ar.canonical_name AS artist_name,
          al.release_year,
          'compilation_title_match'::text AS source_kind,
          cat.position AS track_position,
          cat.title AS sequence_title,
          (al.canonical_cover_path IS NOT NULL AND trim(al.canonical_cover_path) <> '') AS has_canonical_cover,
          (SELECT count(*)::int FROM album_artwork_links aal WHERE aal.album_id = al.id) AS artwork_link_count,
          upper(trim(cat.canonical_track_key)) AS existing_rvtr_on_slot
        FROM canonical_album_tracks cat
        JOIN albums al ON al.id = cat.album_id
        JOIN artists ar ON ar.id = al.artist_id
        WHERE cat.title ILIKE $1
          AND (cat.canonical_track_key IS NULL OR upper(trim(cat.canonical_track_key)) <> upper(trim($2)))
        ORDER BY al.release_year ASC NULLS LAST
        LIMIT 16
        `,
        [`%${track.canonical_title.trim()}%`, rvtr],
      ),
    );
  }

  return [...byMap.values()];
}
