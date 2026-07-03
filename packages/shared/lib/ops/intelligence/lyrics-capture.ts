/** Fetch song lyrics from configured research sources (Wikipedia sections). */

export type LyricsCaptureResult =
  | { available: false }
  | {
      available: true;
      source: string;
      language: string;
      copyrightStatus: string;
      retrievedAt: string;
      fullText: string;
      lineCount: number;
    };

const LYRICS_HEADING = /^lyrics$/i;
const MIN_LINES = 2;
const MIN_CHARS = 40;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "RetroverseIntelligence/1.0 (local research)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countLines(text: string): number {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function isValidLyricsBody(text: string): boolean {
  if (text.length < MIN_CHARS) return false;
  if (/lyrics (are |is )?(protected|omitted|unavailable| withheld)/i.test(text)) return false;
  if (/see (the )?album article/i.test(text)) return false;
  if (countLines(text) < MIN_LINES && text.length < 100) return false;
  return true;
}

async function fetchWikipediaSections(
  pageTitle: string,
): Promise<Array<{ index: string; line: string }>> {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&prop=sections&page=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
  const data = await fetchJson<{
    parse?: { sections?: Array<{ index: string; line: string }> };
  }>(url);
  return data?.parse?.sections ?? [];
}

async function fetchWikipediaSectionText(
  pageTitle: string,
  sectionIndex: string,
): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&section=${sectionIndex}&prop=text&page=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
  const data = await fetchJson<{
    parse?: { text?: { "*"?: string } };
  }>(url);
  const html = data?.parse?.text?.["*"];
  if (!html) return null;
  return stripHtml(html);
}

/** Parse a plain-text Wikipedia extract when a dedicated Lyrics section exists. */
export function extractLyricsFromWikipediaExcerpt(
  excerpt: string,
): LyricsCaptureResult | null {
  const match = excerpt.match(
    /\nLyrics\n+([\s\S]+?)(?:\n(?:Track listing|Charts|Personnel|Reception|Music video|Background|References|Certifications|Formats|Release history)\n|\n[A-Z][a-z]+ [a-z]+\n\n|$)/,
  );
  if (!match?.[1]) return null;

  const text = match[1].trim();
  if (!isValidLyricsBody(text)) return null;

  return {
    available: true,
    source: "Wikipedia (extract)",
    language: "en",
    copyrightStatus: "wikipedia_excerpt",
    retrievedAt: new Date().toISOString(),
    fullText: text,
    lineCount: countLines(text),
  };
}

/** Retrieve full lyrics from a Wikipedia song page section when published there. */
export async function captureLyricsFromWikipedia(input: {
  pageTitle: string;
  pageUrl?: string;
}): Promise<LyricsCaptureResult> {
  const sections = await fetchWikipediaSections(input.pageTitle);
  const lyricsSection = sections.find((s) => LYRICS_HEADING.test(s.line.trim()));
  if (!lyricsSection) return { available: false };

  const raw = await fetchWikipediaSectionText(input.pageTitle, lyricsSection.index);
  if (!raw || !isValidLyricsBody(raw)) return { available: false };

  return {
    available: true,
    source: input.pageUrl?.trim() || `Wikipedia: ${input.pageTitle}`,
    language: "en",
    copyrightStatus: "wikipedia_section",
    retrievedAt: new Date().toISOString(),
    fullText: raw,
    lineCount: countLines(raw),
  };
}
