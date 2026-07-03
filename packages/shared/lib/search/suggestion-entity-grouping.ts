import "server-only";

import { displayArtistName } from "@/lib/artist/slug";
import { artistKeysMatch, normalizeArtistMatchKey } from "./canonicalize-search";

export type GroupedSuggestion<T> = {
  matchKey: string;
  label: string;
  items: T[];
};

/** Group rows by normalized artist match key (server-side dedupe prep). */
export function groupSuggestionsByArtistKey<T>(
  items: T[],
  labelOf: (item: T) => string,
): GroupedSuggestion<T>[] {
  const groups = new Map<string, { label: string; items: T[] }>();
  for (const item of items) {
    const label = labelOf(item).trim();
    if (!label) continue;
    const matchKey = normalizeArtistMatchKey(label);
    if (!matchKey) continue;
    const existing = groups.get(matchKey);
    if (existing) {
      existing.items.push(item);
      if (label.length > existing.label.length) existing.label = label;
    } else {
      groups.set(matchKey, { label, items: [item] });
    }
  }
  return [...groups.entries()].map(([matchKey, g]) => ({
    matchKey,
    label: g.label,
    items: g.items,
  }));
}

/** Merge alias groups (Beatles / The Beatles) under canonical label. */
export function collapseFuzzyAliasGroups<T>(
  groups: GroupedSuggestion<T>[],
  preferredCanonical?: string | null,
): GroupedSuggestion<T>[] {
  if (!preferredCanonical?.trim()) return groups;
  return groups.map((g) => {
    if (!artistKeysMatch(g.label, preferredCanonical)) return g;
    return {
      ...g,
      label: displayArtistName(preferredCanonical),
    };
  });
}
