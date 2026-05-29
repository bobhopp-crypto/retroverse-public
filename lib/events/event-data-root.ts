import { existsSync } from "fs";
import { join } from "path";

/** Root of RETROVERSE_DATA (sibling repo by default). */
export function retroverseDataRoot(): string {
  const fromEnv = process.env.RETROVERSE_DATA_ROOT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const sibling = join(process.cwd(), "..", "RETROVERSE_DATA");
  if (existsSync(sibling)) return sibling;
  return fromEnv || sibling;
}

export function eventIngestRoot(): string {
  return join(retroverseDataRoot(), "metadata", "event_ingest");
}

export function eventIngestPath(...parts: string[]): string {
  return join(eventIngestRoot(), ...parts);
}

/** Parsed JSON filename for a slug (live-aid-1985 → live_aid_1985.json). */
export function parsedEventFilename(slug: string): string {
  return `${slug.replace(/-/g, "_")}.json`;
}
