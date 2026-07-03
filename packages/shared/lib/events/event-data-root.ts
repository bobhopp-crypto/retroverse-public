import { existsSync } from "fs";
import { join } from "path";

/**
 * Root of RETROVERSE_DATA (sibling repo by default).
 * Walks up from cwd so apps/live and apps/studio resolve the same sibling
 * repo as the workspace root.
 */
export function retroverseDataRoot(): string {
  const fromEnv = process.env.RETROVERSE_DATA_ROOT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  let dir = process.cwd();
  for (let i = 0; i < 4; i += 1) {
    const candidate = join(dir, "..", "RETROVERSE_DATA");
    if (existsSync(candidate)) return candidate;
    dir = join(dir, "..");
  }
  return fromEnv || join(process.cwd(), "..", "RETROVERSE_DATA");
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
