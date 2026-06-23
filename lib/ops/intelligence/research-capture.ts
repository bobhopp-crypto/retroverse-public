/** Fetch and preserve Wikipedia excerpts for song research. */

export type WikipediaCapture = {
  id: string;
  source: string;
  url: string;
  title: string;
  excerpt: string;
  confidence: number;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "RetroverseIntelligence/1.0 (local research)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function searchWikipedia(query: string): Promise<{ title: string; pageid: number } | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`;
  const data = await fetchJson<{
    query?: { search?: Array<{ title: string; pageid: number }> };
  }>(url);
  return data?.query?.search?.[0] ?? null;
}

async function fetchWikipediaExtract(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=plain&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  const data = await fetchJson<{
    query?: { pages?: Record<string, { extract?: string }> };
  }>(url);
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const extract = page?.extract?.trim();
  if (!extract || extract.length < 80) return null;
  return extract.slice(0, 6000);
}

function slugId(prefix: string, title: string): string {
  return `${prefix}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
}

export async function captureWikipediaResearch(input: {
  artist: string;
  title: string;
  albumTitle?: string | null;
}): Promise<WikipediaCapture[]> {
  const captures: WikipediaCapture[] = [];
  const now = new Date().toISOString();

  const songHit = await searchWikipedia(`${input.title} ${input.artist} song`);
  if (songHit) {
    const excerpt = await fetchWikipediaExtract(songHit.title);
    if (excerpt) {
      captures.push({
        id: slugId("wiki-song", songHit.title),
        source: "Wikipedia",
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(songHit.title.replace(/ /g, "_"))}`,
        title: songHit.title,
        excerpt,
        confidence: 0.85,
      });
    }
  }

  const albumQuery = input.albumTitle
    ? `${input.albumTitle} ${input.artist} album`
    : `${input.artist} discography`;
  const albumHit = await searchWikipedia(albumQuery);
  if (albumHit && albumHit.title !== songHit?.title) {
    const excerpt = await fetchWikipediaExtract(albumHit.title);
    if (excerpt) {
      captures.push({
        id: slugId("wiki-album", albumHit.title),
        source: "Wikipedia",
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(albumHit.title.replace(/ /g, "_"))}`,
        title: albumHit.title,
        excerpt,
        confidence: 0.75,
      });
    }
  }

  const artistHit = await searchWikipedia(`${input.artist} musician`);
  if (artistHit && artistHit.title !== songHit?.title && artistHit.title !== albumHit?.title) {
    const excerpt = await fetchWikipediaExtract(artistHit.title);
    if (excerpt) {
      captures.push({
        id: slugId("wiki-artist", artistHit.title),
        source: "Wikipedia",
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(artistHit.title.replace(/ /g, "_"))}`,
        title: artistHit.title,
        excerpt,
        confidence: 0.7,
      });
    }
  }

  void now;
  return captures;
}

/** Layer 1 chart facts — deterministic, no fetch required. */
export function buildChartResearchEntry(input: {
  title: string;
  artist: string;
  peakHot100: number | null;
  chartWeeks: number | null;
  year: number | null;
  albumTitle: string | null;
}): WikipediaCapture | null {
  if (input.peakHot100 == null && !input.albumTitle) return null;
  const parts: string[] = [];
  if (input.albumTitle) parts.push(`Album: ${input.albumTitle}${input.year ? ` (${input.year})` : ""}`);
  if (input.peakHot100 != null) {
    parts.push(`Billboard Hot 100 peak: #${input.peakHot100}`);
    if (input.chartWeeks) parts.push(`${input.chartWeeks} weeks on chart`);
  }
  return {
    id: "retroverse-chart",
    source: "Retroverse Graph",
    url: "",
    title: `${input.title} — chart data`,
    excerpt: parts.join(". "),
    confidence: 0.95,
  };
}

/** VDJ rotation signal from local library. */
export function buildVdjResearchEntry(input: {
  title: string;
  playCount: number | null;
  videoInfo: string | null;
  vdjSnapshot?: import("./vdj-intelligence-types").VdjIntelligenceSnapshot;
}): WikipediaCapture | null {
  const snap = input.vdjSnapshot;
  if (snap) {
    const parts = [
      `Artist: ${snap.artist}`,
      `Title: ${snap.title}`,
      snap.album ? `Album: ${snap.album}` : null,
      snap.year ? `Year: ${snap.year}` : null,
      snap.genre ? `Genre: ${snap.genre}` : null,
      snap.playCount != null ? `PlayCount: ${snap.playCount}` : null,
      snap.rating != null ? `Rating: ${snap.rating}` : null,
      snap.lastPlayed ? `LastPlayed: ${snap.lastPlayed}` : null,
      snap.user2 ? `User2/Tags: ${snap.user2}` : null,
      `Path: ${snap.filePath}`,
    ].filter(Boolean);
    return {
      id: "retroverse-vdj-snapshot",
      source: "VirtualDJ database.xml",
      url: "",
      title: `${snap.title} — VDJ library`,
      excerpt: parts.join(" · "),
      confidence: 0.99,
    };
  }

  if (input.playCount == null && !input.videoInfo) return null;
  const parts: string[] = [];
  if (input.playCount != null) parts.push(`VirtualDJ rotation signal (PlayCount): ${input.playCount}`);
  if (input.videoInfo) parts.push(`Owned media: ${input.videoInfo}`);
  return {
    id: "retroverse-vdj",
    source: "VirtualDJ Library",
    url: "",
    title: `${input.title} — DJ library`,
    excerpt: parts.join(". "),
    confidence: 0.98,
  };
}
