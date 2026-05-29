import { inspectQuery } from "@/lib/inspect/pg";

import {
  loadEventIngestFromFiles,
  loadEventIngestManifest,
  flattenEventChapters,
} from "@/lib/events/load-event-ingest";
import type {
  HistoricalEventChapter,
  HistoricalEventIngest,
  HistoricalEventPerformance,
} from "@/lib/events/types";

type PgEventRow = {
  slug: string;
  name: string;
  event_year: number | null;
  event_date: string | null;
};

type PgPerformanceRow = {
  part_number: number;
  part_label: string;
  view_count_raw: string | null;
  view_count: string | null;
  premiere_date_raw: string | null;
  premiere_date: string | null;
  tags_raw: string | null;
  description_raw: string | null;
  raw_block_text: string;
};

type PgChapterRow = {
  part_number: number;
  chapter_index: number;
  timestamp_raw: string;
  end_timestamp_raw: string | null;
  line_raw: string;
  performer_raw: string | null;
  song_raw: string | null;
  location_raw: string | null;
};

type PgNoteRow = {
  part_number: number | null;
  title: string | null;
  raw_text: string;
};

async function pgTablesReady(): Promise<boolean> {
  try {
    const rows = await inspectQuery<{ reg: string }>(
      `SELECT to_regclass('public.historical_events')::text AS reg`,
    );
    return Boolean(rows[0]?.reg);
  } catch {
    return false;
  }
}

async function loadHistoricalEventFromPg(slug: string): Promise<HistoricalEventIngest | null> {
  const events = await inspectQuery<PgEventRow>(
    `SELECT slug, name, event_year, event_date::text
     FROM historical_events WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  const event = events[0];
  if (!event) return null;

  const performances = await inspectQuery<PgPerformanceRow & { part_number: number }>(
    `SELECT p.part_number, p.part_label, p.view_count_raw, p.view_count::text,
            p.premiere_date_raw, p.premiere_date::text, p.tags_raw,
            p.description_raw, p.raw_block_text
     FROM historical_event_performances p
     JOIN historical_events e ON e.id = p.event_id
     WHERE e.slug = $1
     ORDER BY p.part_number ASC`,
    [slug],
  );

  const chapters = await inspectQuery<PgChapterRow>(
    `SELECT p.part_number, c.chapter_index, c.timestamp_raw, c.end_timestamp_raw,
            c.line_raw, c.performer_raw, c.song_raw, c.location_raw
     FROM historical_event_chapters c
     JOIN historical_event_performances p ON p.id = c.performance_id
     JOIN historical_events e ON e.id = p.event_id
     WHERE e.slug = $1
     ORDER BY p.part_number ASC, c.chapter_index ASC`,
    [slug],
  );

  const notes = await inspectQuery<PgNoteRow>(
    `SELECT p.part_number, n.title, n.raw_text
     FROM historical_event_notes n
     JOIN historical_events e ON e.id = n.event_id
     LEFT JOIN historical_event_performances p ON p.id = n.performance_id
     WHERE e.slug = $1
     ORDER BY n.sort_order ASC`,
    [slug],
  );

  const chaptersByPart = new Map<number, HistoricalEventChapter[]>();
  for (const row of chapters) {
    const bucket = chaptersByPart.get(row.part_number) ?? [];
    bucket.push({
      chapter_index: row.chapter_index,
      timestamp_raw: row.timestamp_raw,
      end_timestamp_raw: row.end_timestamp_raw ?? "",
      line_raw: row.line_raw,
      performer_raw: row.performer_raw ?? "",
      song_raw: row.song_raw ?? "",
      location_raw: row.location_raw ?? "",
    });
    chaptersByPart.set(row.part_number, bucket);
  }

  const notesByPart = new Map<number, string>();
  for (const note of notes) {
    if (note.part_number != null) notesByPart.set(note.part_number, note.raw_text);
  }

  const parts: HistoricalEventPerformance[] = performances.map((p) => ({
    part_number: p.part_number,
    part_label: p.part_label,
    view_count_raw: p.view_count_raw ?? "",
    view_count: p.view_count ? Number(p.view_count) : null,
    premiere_date_raw: p.premiere_date_raw ?? "",
    premiere_date: p.premiere_date,
    tags_raw: p.tags_raw ?? "",
    description_raw: p.description_raw ?? "",
    raw_block_text: p.raw_block_text,
    chapters: chaptersByPart.get(p.part_number) ?? [],
    band_aid_note: notesByPart.get(p.part_number) ?? "",
  }));

  const manifest = await loadEventIngestManifest(slug);

  return {
    event_slug: slug,
    event_name: event.name,
    event_year: event.event_year ?? 0,
    event_date: event.event_date ?? "",
    source_filename: manifest?.source_file?.split("/").pop() ?? "",
    source_path: manifest?.source_file ?? "",
    checksum_sha256: manifest?.checksum_sha256 ?? "",
    parsed_at: manifest?.parsed_at ?? "",
    part_count: parts.length,
    chapter_count: chapters.length,
    performer_count: new Set(chapters.map((c) => c.performer_raw).filter(Boolean)).size,
    parts,
  };
}

export { flattenEventChapters } from "@/lib/events/load-event-ingest";

/** Postgres when seeded; otherwise parsed JSON from RETROVERSE_DATA. */
export async function loadHistoricalEvent(
  slug: string,
): Promise<HistoricalEventIngest | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  if (await pgTablesReady()) {
    const fromPg = await loadHistoricalEventFromPg(normalized);
    if (fromPg) return fromPg;
  }

  return loadEventIngestFromFiles(normalized);
}
