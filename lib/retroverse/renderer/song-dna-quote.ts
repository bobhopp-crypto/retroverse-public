import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { ApprovedQuote } from "@/lib/ops/studio/editor/types";

export type SongDnaQuote = {
  text: string;
  attribution: string;
};

const MAX_QUOTE_CHARS = 130;
const MAX_LYRIC_CHARS = 72;
const MIN_QUOTE_CHARS = 12;

const WIKI_FACT_RE =
  /\b(billboard|hot 100|peaked|released|debut album|first single|chart|wikipedia|studio album|b-side|track listing)\b/i;

const TECHNICAL_RE =
  /\b(signal|miked|mic\b|amp head|pedal|panned|fender rhodes|record plant|direct signal|volume pedal|mixing|mastered)\b/i;

type QuoteTier = "artist" | "songwriter" | "producer_interview" | "lyric";

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripOuterQuotes(text: string): string {
  const t = text.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith("\u201c") && t.endsWith("\u201d"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function formatQuoteText(text: string): string {
  const core = stripOuterQuotes(normalizeWhitespace(text));
  if (!core) return "";
  if (core.startsWith("\u201c") || core.startsWith("\u201d")) return core;
  if (core.includes('"')) return `\u201c${core.replace(/"/g, "")}\u201d`;
  if (core.startsWith('"')) return core;
  return `"${core}"`;
}

function lyricAttribution(artist: string, title: string): string {
  return `\u2014 ${artist}, "${title}"`;
}

function isWikiFact(text: string): boolean {
  const t = normalizeWhitespace(text);
  if (WIKI_FACT_RE.test(t)) return true;
  if (/^"?(The song|It was|They were|This (song|track|single))/i.test(t)) return true;
  return false;
}

function isMemorableQuote(text: string): boolean {
  const t = normalizeWhitespace(text);
  if (t.length < MIN_QUOTE_CHARS) return false;
  if (isWikiFact(t)) return false;
  if (TECHNICAL_RE.test(t)) return false;
  if (/\[\.\.\.\]/.test(t)) return false;
  return true;
}

function shortenToLimit(text: string, max: number): string | null {
  const normalized = stripOuterQuotes(normalizeWhitespace(text));
  if (normalized.length < MIN_QUOTE_CHARS) return null;
  if (normalized.length <= max && isMemorableQuote(normalized)) return normalized;

  const sentence = normalized.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? normalized;
  if (sentence.length >= MIN_QUOTE_CHARS && sentence.length <= max && isMemorableQuote(sentence)) {
    return sentence;
  }

  const words = normalized.split(/\s+/);
  let built = "";
  for (const word of words) {
    const next = built ? `${built} ${word}` : word;
    if (next.length > max) break;
    built = next;
  }
  if (built.length >= MIN_QUOTE_CHARS && isMemorableQuote(built)) return built;
  return null;
}

function classifyApprovedQuote(
  quote: ApprovedQuote,
  artist: string,
  title: string,
): QuoteTier | null {
  const attr = (quote.attribution ?? "").toLowerCase();
  const text = stripOuterQuotes(quote.text);
  if (!text || isWikiFact(text)) return null;

  if (/lyric|from the song|chorus|verse/.test(attr) || attr.includes(`"${title.toLowerCase()}"`)) {
    return "lyric";
  }
  if (/songwriter|writer|wrote|composed|lyricist|co-wrote|co-writer/.test(attr)) {
    return "songwriter";
  }
  if (/producer|engineer|interview|retrospective|documentary|podcast|mix/.test(attr)) {
    return "producer_interview";
  }

  const artistLower = artist.toLowerCase();
  if (
    attr.includes(artistLower) ||
    /\b(singer|vocalist|artist|frontman|band member|member of|lead)\b/.test(attr)
  ) {
    return "artist";
  }

  if (quote.attribution?.trim()) {
    const name = quote.attribution.split(/[,(\u2014—-]/)[0]?.trim().toLowerCase() ?? "";
    const artistTokens = artistLower.split(/\s+/).filter(Boolean);
    if (name && artistTokens.some((token) => token.length > 2 && name.includes(token))) {
      return "artist";
    }
    return "producer_interview";
  }

  if (text.length <= MAX_LYRIC_CHARS && /^[A-Z"'(]/.test(text)) return "lyric";
  return null;
}

function approvedQuoteToSongDna(
  quote: ApprovedQuote,
  tier: QuoteTier,
  artist: string,
  title: string,
): SongDnaQuote | null {
  const max = tier === "lyric" ? MAX_LYRIC_CHARS : MAX_QUOTE_CHARS;
  const shortened = shortenToLimit(quote.text, max);
  if (!shortened) return null;

  const text = formatQuoteText(shortened);
  const attribution =
    tier === "lyric"
      ? quote.attribution?.trim() || lyricAttribution(artist, title)
      : quote.attribution?.trim()
        ? quote.attribution.trim().startsWith("\u2014") || quote.attribution.trim().startsWith("-")
          ? quote.attribution.trim()
          : `\u2014 ${quote.attribution.trim()}`
        : "";

  if (tier !== "lyric" && !attribution) return null;
  return { text, attribution };
}

function pickFromApprovedQuotes(
  quotes: ApprovedQuote[],
  artist: string,
  title: string,
): SongDnaQuote | null {
  const tiers: QuoteTier[] = ["artist", "songwriter", "producer_interview", "lyric"];

  for (const tier of tiers) {
    for (const quote of quotes) {
      const classified = classifyApprovedQuote(quote, artist, title);
      if (classified !== tier) continue;
      const resolved = approvedQuoteToSongDna(quote, tier, artist, title);
      if (resolved) return resolved;
    }
  }

  return null;
}

function recordingNotes(collector: CollectorPackage): string[] {
  return [
    ...(collector.recording?.notes ?? []),
    ...(collector.song?.recording?.notes ?? []),
  ];
}

function extractArtistQuoteFromExcerpt(
  excerpt: string,
  notes: string[],
): SongDnaQuote | null {
  const fromNotes = quoteFromRecordingNotes(notes, excerpt);
  if (fromNotes) return fromNotes;

  const singerSaid = extractSingerSaidQuote(excerpt);
  if (singerSaid) return singerSaid;

  const hasSaid = extractHasSaidAboutSong(excerpt);
  if (hasSaid) return hasSaid;

  const interview = extractInterviewPullQuote(excerpt);
  if (interview?.attribution) return interview;

  const continues = extractContinuesQuote(excerpt);
  if (continues) return continues;

  return null;
}

function singerSaidSpeaker(excerpt: string): string | null {
  return (
    excerpt.match(
      /(?:Singer|Vocalist|Frontman|(?:founding )?member)\s+([^,\n]+?)\s+said(?:,|\s*\n)/i,
    )?.[1]?.trim() ?? null
  );
}

function isEncyclopediaNote(note: string): boolean {
  const t = normalizeWhitespace(note);
  if (/\bis a song by\b/i.test(t)) return true;
  if (/^"[^"]+" is a /i.test(t)) return true;
  if (/^Track listings|^Title of Record is|^Background and composition/i.test(t)) return true;
  if (/\balbum's earlier sessions\b/i.test(t)) return true;
  if (/\blineup changes\b/i.test(t)) return true;
  return false;
}

function quoteFromRecordingNotes(notes: string[], excerpt: string): SongDnaQuote | null {
  const speaker = singerSaidSpeaker(excerpt);
  if (!speaker) return null;

  for (const note of notes) {
    if (isEncyclopediaNote(note)) continue;
    const clause = note.split(/,\s+and it was|\.\s+/)[0]?.trim() ?? note.trim();
    const shortened = shortenToLimit(clause, MAX_QUOTE_CHARS);
    if (!shortened) continue;
    if (!/\b(I|my|we|our|you|got)\b/i.test(shortened) && !/["'\u201c]/.test(shortened)) continue;
    return {
      text: formatQuoteText(shortened),
      attribution: `\u2014 ${speaker}`,
    };
  }
  return null;
}

function extractSingerSaidQuote(excerpt: string): SongDnaQuote | null {
  const singerSaid = excerpt.match(
    /(?:Singer|Vocalist|Frontman|(?:founding )?member)\s+([^,\n]+?)\s+said,?\s*\n+\s*([\s\S]+?)(?:\n\n|\nB-sides|\nReception|\nTrack listing|\nCharts|\nReferences|$)/i,
  );
  if (!singerSaid) return null;

  const name = singerSaid[1]!.trim();
  const body = singerSaid[2]!.replace(/\([^)]*\)/g, " ");
  const sentences = body.split(/(?<=[.!?])\s+|,\s+(?=but when|and when|the chorus)/i);

  const candidates: string[] = [];
  for (const sentence of sentences) {
    const shortened = shortenToLimit(sentence, MAX_QUOTE_CHARS);
    if (!shortened) continue;
    if (!/\b(I|my|we|our|you|got)\b/i.test(shortened)) continue;
    candidates.push(shortened);
  }

  const best = candidates.sort((a, b) => a.length - b.length)[0];
  if (!best) return null;

  return {
    text: formatQuoteText(best),
    attribution: `\u2014 ${name}`,
  };
}

function extractHasSaidAboutSong(excerpt: string): SongDnaQuote | null {
  const match = excerpt.match(
    /(?:Filter )?frontman and founding member\s+([^,\n]+?)\s+has said that the song is about\s+(.+?)\./i,
  );
  if (!match) return null;

  const shortened = shortenToLimit(match[2]!, MAX_QUOTE_CHARS);
  if (!shortened) return null;

  return {
    text: formatQuoteText(shortened),
    attribution: `\u2014 ${match[1]!.trim()}`,
  };
}

function extractInterviewPullQuote(excerpt: string): SongDnaQuote | null {
  const block = excerpt.match(/(?:retrospective )?interview:\s*\n+\s*"([\s\S]+?)"\s*(?:\n[A-Z]|\n\n|$)/i);
  if (!block) return null;

  const speaker =
    excerpt.match(
      /(?:Filter )?frontman and founding member\s+([^,\n]+?)\s+has said/i,
    )?.[1]?.trim() ??
    excerpt.match(/(?:continues|recalls)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\./i)?.[1]?.trim() ??
    null;

  const innerQuotes = [...block[1]!.matchAll(/"([^"]{12,100})"/g)]
    .map((m) => m[1]!.trim())
    .filter(isMemorableQuote)
    .sort((a, b) => a.length - b.length);

  const line =
    innerQuotes.find((q) => /\b(I|my|we|you|love|remember|lord)\b/i.test(q)) ?? innerQuotes[0];
  if (!line) return null;

  return {
    text: formatQuoteText(line),
    attribution: speaker ? `\u2014 ${speaker}` : "",
  };
}

function extractContinuesQuote(excerpt: string): SongDnaQuote | null {
  const match = excerpt.match(
    /continues\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\.\s*"([^"]{12,400})"/i,
  );
  if (!match) return null;

  const shortened = shortenToLimit(match[2]!, MAX_QUOTE_CHARS);
  if (!shortened) return null;

  return {
    text: formatQuoteText(shortened),
    attribution: `\u2014 ${match[1]!.trim()}`,
  };
}

function extractProducerQuoteFromExcerpt(excerpt: string): SongDnaQuote | null {
  const producerSaid = excerpt.match(
    /(?:Producer|producer)\s+([^,\n]+?)\s+said,?\s*\n+\s*([\s\S]+?)(?:\n\n|$)/i,
  );
  if (!producerSaid) return null;

  const shortened = shortenToLimit(producerSaid[2]!, MAX_QUOTE_CHARS);
  if (!shortened) return null;

  return {
    text: formatQuoteText(shortened),
    attribution: `\u2014 ${producerSaid[1]!.trim()}`,
  };
}

function extractLyricFromExcerpt(excerpt: string, artist: string, title: string): SongDnaQuote | null {
  const lyricSection = excerpt.match(/\b(?:Lyrics|Composition and lyrics|Background and lyrics)\b[\s\S]{0,500}/i);
  if (!lyricSection) return null;

  const quoted = [...lyricSection[0]!.matchAll(/["\u201c]([^"\u201d\n]{8,72})["\u201d]/g)]
    .map((m) => stripOuterQuotes(m[1]!))
    .filter(isMemorableQuote)
    .filter((line) => line.split(/\s+/).length >= 3)
    .filter((line) => line.toLowerCase() !== title.toLowerCase())
    .filter((line) => !/\b(pt\.|vol\.|no\.)\s*\d/i.test(line))
    .sort((a, b) => a.length - b.length);

  const line = quoted.find((q) => !/^The song|^It was|^Background/i.test(q));
  if (!line) return null;

  return {
    text: formatQuoteText(line),
    attribution: lyricAttribution(artist, title),
  };
}

function songFocusedExcerpts(collector: CollectorPackage, title: string): string[] {
  const entries = collector.sourceLog ?? [];
  const wikiSong = entries
    .filter((entry) => entry.id.startsWith("wiki-song-"))
    .map((entry) => entry.excerpt)
    .filter(Boolean);
  if (wikiSong.length > 0) return wikiSong;

  const titleNorm = title.toLowerCase();
  return entries
    .map((entry) => entry.excerpt)
    .filter(Boolean)
    .filter((excerpt) => {
      const head = excerpt.slice(0, 700).toLowerCase();
      return (
        head.includes(`"${titleNorm}" is a song`) ||
        head.includes(`"${titleNorm}" is the first single`) ||
        (head.includes(`"${titleNorm}"`) && head.includes(" is a song by "))
      );
    });
}

function pickFromSourceLogs(collector: CollectorPackage, artist: string, title: string): SongDnaQuote | null {
  const excerpts = songFocusedExcerpts(collector, title);
  if (excerpts.length === 0) return null;

  const notes = recordingNotes(collector);

  for (const excerpt of excerpts) {
    const artistQuote = extractArtistQuoteFromExcerpt(excerpt, notes);
    if (artistQuote?.attribution) return artistQuote;
  }
  for (const excerpt of excerpts) {
    const producerQuote = extractProducerQuoteFromExcerpt(excerpt);
    if (producerQuote) return producerQuote;
  }
  for (const excerpt of excerpts) {
    const lyric = extractLyricFromExcerpt(excerpt, artist, title);
    if (lyric) return lyric;
  }

  return null;
}

/** Resolve one museum Song DNA quote from existing pipeline data — presentation only. */
export function resolveSongDnaQuote(
  collector: CollectorPackage,
  approvedQuotes: ApprovedQuote[] = [],
): SongDnaQuote | null {
  const artist = collector.artist.trim();
  const title = collector.title.trim();

  const fromApproved = pickFromApprovedQuotes(approvedQuotes, artist, title);
  if (fromApproved) return fromApproved;

  return pickFromSourceLogs(collector, artist, title);
}
