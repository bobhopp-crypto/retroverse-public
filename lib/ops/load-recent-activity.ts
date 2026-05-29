import { listHistoricalEventSummaries } from "@/lib/events/load-event-ingest";
import { ensureUniqueRowIds } from "@/lib/ops/ensure-unique-ids";
import { inspectQuery } from "@/lib/inspect/pg";
import type { OpsActivityRow } from "@/lib/ops/types";

function formatTs(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    const raw = String(value);
    return raw.length >= 19 ? raw.slice(0, 19).replace("T", " ") : raw;
  }
  return d.toISOString().replace("T", " ").slice(0, 19);
}

type ArtworkActivityRow = {
  link_id: number;
  pg_album_id: number;
  updated_at: string;
  rval: string | null;
  title: string;
  artist_name: string;
  review_flag: string;
  r2_cover_key: string | null;
};

type MediaActivityRow = {
  updated_at: string;
  id: number;
  artist_text: string | null;
  title_text: string | null;
  source_path: string | null;
  r2_media_key: string | null;
};

export async function loadRecentActivityQueue(): Promise<OpsActivityRow[]> {
  const [artworkRows, mediaRows, events] = await Promise.all([
    inspectQuery<ArtworkActivityRow>(
      `
      SELECT
        aal.id AS link_id,
        al.id AS pg_album_id,
        aal.updated_at::text AS updated_at,
        aek.external_key AS rval,
        al.title,
        ar.canonical_name AS artist_name,
        aal.review_flag,
        aal.r2_cover_key
      FROM album_artwork_links aal
      JOIN albums al ON al.id = aal.album_id
      JOIN artists ar ON ar.id = al.artist_id
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id
      WHERE aal.review_flag IN ('curated', 'ok')
      ORDER BY aal.updated_at DESC NULLS LAST
      LIMIT 12
      `,
    ),
    inspectQuery<MediaActivityRow>(
      `
      SELECT
        ma.updated_at::text AS updated_at,
        ma.id,
        ma.artist_text,
        ma.title_text,
        ma.source_path,
        ma.r2_media_key
      FROM media_assets ma
      WHERE ma.r2_media_key IS NOT NULL
        AND trim(ma.r2_media_key) <> ''
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT 12
      `,
    ),
    listHistoricalEventSummaries(),
  ]);

  const activity: OpsActivityRow[] = [];

  for (const row of artworkRows) {
    const rval = row.rval?.trim().toUpperCase();
    activity.push({
      id: `act-art-link-${row.link_id}`,
      ts: formatTs(row.updated_at),
      entity: `${rval || "album"} · ${row.title}`,
      action: row.r2_cover_key?.trim() ? "artwork.approved" : "artwork.curated",
      source: `album_artwork_links:${row.review_flag}`,
      status: "ok",
    });
  }

  for (const row of mediaRows) {
    activity.push({
      id: `act-media-${row.id}`,
      ts: formatTs(row.updated_at),
      entity: `${row.artist_text || "?"} — ${row.title_text || "?"}`,
      action: "upload.r2_key_set",
      source: "media_assets",
      status: "ok",
    });
  }

  for (const event of events.slice(0, 8)) {
    activity.push({
      id: `act-event-${event.slug}`,
      ts: formatTs(event.parsed_at),
      entity: `event:${event.slug}`,
      action: "event.ingest.run",
      source: "RETROVERSE_DATA/event_ingest",
      status: "ok",
    });
  }

  activity.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

  return ensureUniqueRowIds(activity.slice(0, 25));
}
