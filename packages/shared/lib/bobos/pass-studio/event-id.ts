/** Stable slug for an event name — shared by batches, templates, and workspace keys. */
export function eventIdFromName(eventName: string): string {
  const slug = eventName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "event";
}
