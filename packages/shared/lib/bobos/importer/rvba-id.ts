import { slugify } from "./slug";

/** Canonical id for one imported slide's RVBA asset. Keeps the RVBA prefix
 * rule (`.cursor/rules/retroverse-data.mdc`) — collection + position encoded
 * so ids stay stable across re-reads without a central counter. */
export function buildRvbaId(collectionId: string, sequenceIndex: number): string {
  const slug = slugify(collectionId).toUpperCase().replace(/-/g, "");
  return `RVBA-${slug}-${String(sequenceIndex).padStart(3, "0")}`;
}

/** Stable collection id derived from its title, e.g. "Live Aid 1985" -> "live-aid-1985". */
export function buildCollectionId(title: string): string {
  return slugify(title);
}
