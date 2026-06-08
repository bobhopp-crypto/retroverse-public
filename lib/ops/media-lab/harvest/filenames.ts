import { parseTypedTitle } from "@/lib/ops/media-lab/editorial/transcript-suggestions";

export function sanitizeHarvestFilename(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "Untitled";
}

/** Subject-only filename base — e.g. "Taco Bell" from "Commercial - Taco Bell". */
export function subjectFromTitle(title: string): string {
  const parsed = parseTypedTitle(title.trim());
  if (parsed.subject && parsed.subject !== title.trim()) {
    return sanitizeHarvestFilename(parsed.subject);
  }
  return sanitizeHarvestFilename(title.trim() || "Untitled");
}
