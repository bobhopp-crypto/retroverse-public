/** YouTube search URL builder — acquisition intelligence only (no download/scrape). */

export function buildYouTubeSearchUrl(artist: string, title: string): string {
  const q = encodeURIComponent(`${artist} ${title}`.trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}

export function buildYouTubeSearchQuery(artist: string, title: string): string {
  return `${artist} ${title}`.trim();
}
