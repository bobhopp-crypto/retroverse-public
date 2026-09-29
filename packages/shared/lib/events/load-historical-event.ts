import { loadEventIngestFromFiles } from "@/lib/events/load-event-ingest";
import type { HistoricalEventIngest } from "@/lib/events/types";

export { flattenEventChapters } from "@/lib/events/load-event-ingest";

/** The original parsed event files are bundled with the public application. */
export async function loadHistoricalEvent(slug: string): Promise<HistoricalEventIngest | null> {
  const normalized = slug.trim().toLowerCase();
  return normalized ? loadEventIngestFromFiles(normalized) : null;
}
