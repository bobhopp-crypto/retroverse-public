import type { SearchEntity } from "@/lib/search/search-entity-types";

function hrefKey(href: string): string {
  return href.trim().split("?")[0]?.toLowerCase() ?? "";
}

/** One navigable entity per canonical href / RV id. */
export function dedupeSearchEntities(entities: SearchEntity[]): SearchEntity[] {
  const seenHref = new Set<string>();
  const seenRv = new Set<string>();
  const out: SearchEntity[] = [];

  for (const entity of entities) {
    const rv = entity.rvId?.trim().toUpperCase();
    const href = hrefKey(entity.href);
    if (rv && seenRv.has(rv)) continue;
    if (href && seenHref.has(href)) continue;
    if (rv) seenRv.add(rv);
    if (href) seenHref.add(href);
    out.push(entity);
  }

  return out;
}
