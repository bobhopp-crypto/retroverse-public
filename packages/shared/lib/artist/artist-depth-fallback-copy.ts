/** Archive-page sentence. Mentions the song only when this visit actually has one. */
export function artistDepthFallbackBody(name: string, songHref?: string | null): string {
  const label = name.trim() || "This artist";
  if (songHref?.trim()) {
    return `${label} is on this song, and the canonical artist page is not linked yet.`;
  }
  return `The canonical artist page for ${label} is not linked yet.`;
}
