export type EventIngestManifest = {
  ingest_version: string;
  event_slug: string;
  event_name: string;
  event_year: number;
  source_file: string;
  raw_backup?: string;
  checksum_sha256: string;
  parsed_at: string;
  parser_script?: string;
  outputs?: {
    csv?: string[];
    parsed_json?: string;
    sql_schema?: string;
    sql_seed?: string;
  };
  counts?: {
    parts?: number;
    chapters?: number;
    performers?: number;
    videos?: number;
  };
};

export type HistoricalEventChapter = {
  chapter_index: number;
  timestamp_raw: string;
  end_timestamp_raw?: string;
  line_raw: string;
  performer_raw: string;
  song_raw: string;
  location_raw: string;
};

export type HistoricalEventPerformance = {
  part_number: number;
  part_label: string;
  view_count_raw: string;
  view_count: number | null;
  premiere_date_raw: string;
  premiere_date: string | null;
  tags_raw: string;
  description_raw: string;
  raw_block_text: string;
  chapters: HistoricalEventChapter[];
  band_aid_note: string;
};

export type HistoricalEventIngest = {
  event_slug: string;
  event_name: string;
  event_year: number;
  event_date: string;
  source_filename: string;
  source_path: string;
  checksum_sha256: string;
  parsed_at: string;
  part_count: number;
  chapter_count: number;
  performer_count: number;
  parts: HistoricalEventPerformance[];
};

export type HistoricalEventSummary = {
  slug: string;
  name: string;
  year: number;
  parsed_at: string;
  checksum_sha256: string;
  counts: EventIngestManifest["counts"];
};

export type HistoricalEventChapterRow = HistoricalEventChapter & {
  event_slug: string;
  part_number: number;
  source_video_key: string;
};
