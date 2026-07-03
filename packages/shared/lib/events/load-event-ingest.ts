import { readFile } from "fs/promises";
import { readdir } from "fs/promises";
import { join } from "path";

import {
  eventIngestPath,
  parsedEventFilename,
} from "@/lib/events/event-data-root";
import type {
  EventIngestManifest,
  HistoricalEventChapterRow,
  HistoricalEventIngest,
  HistoricalEventSummary,
} from "@/lib/events/types";

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function listEventIngestManifests(): Promise<EventIngestManifest[]> {
  const dir = eventIngestPath("manifests");
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }

  const manifests: EventIngestManifest[] = [];
  for (const name of names.filter((n) => n.endsWith(".json")).sort()) {
    const manifest = await readJsonFile<EventIngestManifest>(join(dir, name));
    if (manifest?.event_slug) manifests.push(manifest);
  }
  return manifests;
}

export async function loadEventIngestManifest(
  slug: string,
): Promise<EventIngestManifest | null> {
  const fileSlug = slug.replace(/-/g, "_");
  return readJsonFile<EventIngestManifest>(
    eventIngestPath("manifests", `${fileSlug}.json`),
  );
}

export async function loadEventIngestFromFiles(
  slug: string,
): Promise<HistoricalEventIngest | null> {
  return readJsonFile<HistoricalEventIngest>(
    eventIngestPath("parsed", parsedEventFilename(slug)),
  );
}

export async function listHistoricalEventSummaries(): Promise<HistoricalEventSummary[]> {
  const manifests = await listEventIngestManifests();
  return manifests.map((m) => ({
    slug: m.event_slug,
    name: m.event_name,
    year: m.event_year,
    parsed_at: m.parsed_at,
    checksum_sha256: m.checksum_sha256,
    counts: m.counts,
  }));
}

export function flattenEventChapters(
  event: HistoricalEventIngest,
): HistoricalEventChapterRow[] {
  const rows: HistoricalEventChapterRow[] = [];
  for (const part of event.parts) {
    const sourceVideoKey = `live_aid_40th_anniversary_part_${part.part_number}`;
    for (const chapter of part.chapters) {
      rows.push({
        ...chapter,
        event_slug: event.event_slug,
        part_number: part.part_number,
        source_video_key: sourceVideoKey,
      });
    }
  }
  return rows;
}

export async function loadEventChaptersFromFiles(
  slug: string,
  options?: { part?: number; performer?: string; location?: string },
): Promise<HistoricalEventChapterRow[]> {
  const event = await loadEventIngestFromFiles(slug);
  if (!event) return [];

  let rows = flattenEventChapters(event);
  if (options?.part != null) {
    rows = rows.filter((r) => r.part_number === options.part);
  }
  if (options?.performer?.trim()) {
    const needle = options.performer.trim().toLowerCase();
    rows = rows.filter((r) => r.performer_raw.toLowerCase().includes(needle));
  }
  if (options?.location?.trim()) {
    const needle = options.location.trim().toLowerCase();
    rows = rows.filter((r) => r.location_raw.toLowerCase().includes(needle));
  }
  return rows;
}
