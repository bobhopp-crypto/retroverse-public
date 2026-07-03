import { mkdir } from "fs/promises";
import { join } from "path";

import { retroverseDataRoot } from "@/lib/events/event-data-root";

/** `RETROVERSE_DATA/YEARS/{year}/production/metadata` */
export function yearProductionMetadataRoot(year: number): string {
  return join(retroverseDataRoot(), "YEARS", String(year), "production", "metadata");
}

export function slugFromVideoFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim() || "video";
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${slug || "video"}-${stamp}`;
}

export function jobOutputDir(year: number, jobSlug: string): string {
  return join(yearProductionMetadataRoot(year), jobSlug);
}

export async function ensureJobOutputDir(
  year: number,
  jobSlug: string,
): Promise<string> {
  const dir = jobOutputDir(year, jobSlug);
  await mkdir(dir, { recursive: true });
  return dir;
}
