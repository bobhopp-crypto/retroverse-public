import type { RequestSourceKind } from "./types";

function sourceLeaf(sourceLabel: string): string {
  return sourceLabel
    .split(/[\\/]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1) ?? "Tonight's Songs";
}

export function guestCatalogDisplayName(
  sourceLabel: string,
  sourceKind: RequestSourceKind,
): string {
  const name = sourceLeaf(sourceLabel)
    .replace(/(\d{4})['’]s\b/gi, "$1s")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (sourceKind === "playlist") return `${name} Playlist`;
  if (sourceKind === "list") return `${name} List`;
  if (/^video(?:s)?\//i.test(sourceLabel.trim())) return `${name} Video Collection`;
  return `${name} Collection`;
}
