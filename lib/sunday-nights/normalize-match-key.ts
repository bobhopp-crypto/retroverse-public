/** Normalize artist/title for persistent alias keys. */
export function normalizeMatchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ");
}

export function matchAliasKey(artist: string, title: string): string {
  return `${normalizeMatchText(artist)}::${normalizeMatchText(title)}`;
}
