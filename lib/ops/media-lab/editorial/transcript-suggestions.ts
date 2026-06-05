import type { TranscriptSegment } from "../build-chapters-from-segments";
import { extractBrandFromText } from "../commercial/brand-detect";
import type { EditorialChapter } from "../chapters-csv";
import type { ChapterOcrHint } from "./chapter-ocr";

export type ClipOcrInput = Pick<ChapterOcrHint, "primarySubject" | "subjects">;

export const CONTENT_TYPES = [
  "Performance",
  "Commercial",
  "Award",
  "Acceptance Speech",
  "Presenter",
  "Interview",
  "Promo",
  "Movie Trailer",
  "News",
  "Station ID",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const REVIEW_STATUSES = ["Keep", "Reject"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const CONTEXT_PAD_SEC = 30;

export type ClipTranscriptContext = {
  before: string;
  clip: string;
  after: string;
  combined: string;
};

export type ClipTagSuggestion = {
  type: ContentType;
  subject: string;
  title: string;
  confidence: number;
  reasons: string[];
  ocrSubject?: string | null;
};

const PERFORMER_LEXICON: { match: RegExp; name: string }[] = [
  { match: /\bgenesis\b/i, name: "Genesis" },
  { match: /\bboyz?\s*(?:ii|2)\s*men\b/i, name: "Boyz II Men" },
  { match: /\bgarth\s+brooks\b/i, name: "Garth Brooks" },
  { match: /\bmadonna\b/i, name: "Madonna" },
  { match: /\bwhitney\s+houston\b/i, name: "Whitney Houston" },
  { match: /\bmichael\s+jackson\b/i, name: "Michael Jackson" },
  { match: /\bprince\b/i, name: "Prince" },
  { match: /\bu2\b/i, name: "U2" },
  { match: /\baerosmith\b/i, name: "Aerosmith" },
  { match: /\bmetallica\b/i, name: "Metallica" },
  { match: /\bnirvana\b/i, name: "Nirvana" },
  { match: /\bpearljam\b/i, name: "Pearl Jam" },
  { match: /\br\.?\s*kelly\b/i, name: "R. Kelly" },
  { match: /\bmariah\s+carey\b/i, name: "Mariah Carey" },
  { match: /\bc\.?\s*eline\s+dion\b/i, name: "Celine Dion" },
  { match: /\bjohnny\s+cash\b/i, name: "Johnny Cash" },
  { match: /\belton\s+john\b/i, name: "Elton John" },
  { match: /\bbilly\s+joel\b/i, name: "Billy Joel" },
  { match: /\bbruce\s+springsteen\b/i, name: "Bruce Springsteen" },
  { match: /\bsteve\s+wonder\b/i, name: "Stevie Wonder" },
  { match: /\bstevie\s+wonder\b/i, name: "Stevie Wonder" },
  { match: /\btina\s+turner\b/i, name: "Tina Turner" },
  { match: /\bdolly\s+parton\b/i, name: "Dolly Parton" },
  { match: /\breba\s+mcentire\b/i, name: "Reba McEntire" },
  { match: /\bshania\s+twain\b/i, name: "Shania Twain" },
];

const MOVIE_LEXICON: { match: RegExp; name: string }[] = [
  { match: /\bhome\s+alone\s+2\b/i, name: "Home Alone 2" },
  { match: /\bhome\s+alone\b/i, name: "Home Alone" },
  { match: /\bjurassic\s+park\b/i, name: "Jurassic Park" },
  { match: /\bterminator\s+2\b/i, name: "Terminator 2" },
  { match: /\bforrest\s+gump\b/i, name: "Forrest Gump" },
];

const SHOW_PROMO_LEXICON: { match: RegExp; name: string }[] = [
  { match: /\bmurphy\s+brown\b/i, name: "Murphy Brown" },
  { match: /\bcheers\b/i, name: "Cheers" },
  { match: /\bseinfeld\b/i, name: "Seinfeld" },
  { match: /\bfriends\b/i, name: "Friends" },
  { match: /\bill\s+be\s+there\b/i, name: "I'll Be There" },
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "our",
  "now",
  "here",
  "there",
  "please",
  "welcome",
  "ladies",
  "gentlemen",
  "tonight",
  "billboard",
  "music",
  "awards",
  "award",
  "presenting",
  "performance",
  "performing",
]);

type TypeRule = {
  type: ContentType;
  clipPatterns: RegExp[];
  contextPatterns?: RegExp[];
  weight: number;
};

const TYPE_RULES: TypeRule[] = [
  {
    type: "Commercial",
    clipPatterns: [
      /\bcommercial\b/i,
      /\bsponsor(?:ed|ing)?\b/i,
      /\bbrought\s+to\s+you\s+by\b/i,
      /\bnow\s+available\b/i,
      /\btry\s+new\b/i,
      /\bdiscover\b/i,
    ],
    weight: 1.15,
  },
  {
    type: "Acceptance Speech",
    clipPatterns: [
      /\bthank\s+you\b/i,
      /\baccept(?:ance|ing|s)?\s+(?:this\s+)?award\b/i,
      /\bmeans\s+(?:so\s+much|the\s+world)\b/i,
      /\bgrateful\b/i,
      /\bi(?:'m|\s+am)\s+(?:so\s+)?honored\b/i,
    ],
    weight: 1.2,
  },
  {
    type: "Award",
    clipPatterns: [
      /\band\s+the\s+(?:award|winner)\b/i,
      /\bwinner\s+is\b/i,
      /\bpresent(?:s|ing)\s+the\s+award\b/i,
      /\b(?:top|best|female|male|album|artist|song)\s+(?:of|in)\b/i,
      /\baward\s+(?:for|goes)\b/i,
      /\bnominee\b/i,
    ],
    weight: 1.15,
  },
  {
    type: "Presenter",
    clipPatterns: [
      /\bhere\s+to\s+present\b/i,
      /\bto\s+present\s+the\b/i,
      /\bplease\s+welcome\b/i,
      /\bladies\s+and\s+gentlemen\b/i,
      /\bput\s+your\s+hands\s+together\b/i,
    ],
    contextPatterns: [/\bpresent(?:ing|er)\b/i],
    weight: 1.05,
  },
  {
    type: "Performance",
    clipPatterns: [
      /\bperform(?:ance|ing)\b/i,
      /\bsing(?:ing|s)?\b/i,
      /\blive\s+performance\b/i,
      /\bwith\s+a\s+performance\s+by\b/i,
      /\bplaying\s+(?:their|his|her)\b/i,
    ],
    weight: 1.1,
  },
  {
    type: "Movie Trailer",
    clipPatterns: [
      /\btrailer\b/i,
      /\bin\s+theaters\b/i,
      /\bcoming\s+(?:soon|this)\b/i,
      /\bstarring\b/i,
      /\bmotion\s+picture\b/i,
    ],
    weight: 1.15,
  },
  {
    type: "Interview",
    clipPatterns: [
      /\binterview\b/i,
      /\bjoin(?:ing)?\s+me\b/i,
      /\btalk(?:ing)?\s+(?:with|to)\b/i,
      /\bsit\s+down\s+with\b/i,
      /\bQ\s*&\s*A\b/i,
    ],
    weight: 1.05,
  },
  {
    type: "News",
    clipPatterns: [
      /\bbreaking\s+news\b/i,
      /\bnews\s+(?:desk|room|anchor)\b/i,
      /\b(?:good|late)\s+evening\b/i,
      /\bheadlines\b/i,
      /\bthis\s+is\s+(?:abc|nbc|cbs)\s+news\b/i,
    ],
    weight: 1.1,
  },
  {
    type: "Station ID",
    clipPatterns: [
      /\b(?:abc|nbc|cbs|fox|bbc)\b/i,
      /\bstation\s+identification\b/i,
      /\bnetwork\s+identification\b/i,
      /\bwe(?:'ll|\s+will)\s+return\b/i,
      /\bstay\s+tuned\b/i,
      /\bafter\s+these\s+messages\b/i,
    ],
    weight: 1.05,
  },
  {
    type: "Promo",
    clipPatterns: [
      /\bdon't\s+miss\b/i,
      /\bcoming\s+up\b/i,
      /\bnext\s+(?:on|week)\b/i,
      /\btonight\s+at\b/i,
      /\bpromo\b/i,
    ],
    weight: 0.95,
  },
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function segmentsInRange(
  segments: TranscriptSegment[],
  start: number,
  end: number,
): TranscriptSegment[] {
  return segments.filter((s) => s.end > start && s.start < end);
}

export function rangeText(
  segments: TranscriptSegment[],
  start: number,
  end: number,
): string {
  return normalizeText(
    segmentsInRange(segments, start, end)
      .map((s) => s.text)
      .join(" "),
  );
}

export function clipTranscriptContext(
  segments: TranscriptSegment[],
  startSec: number,
  endSec: number,
  padSec = CONTEXT_PAD_SEC,
): ClipTranscriptContext {
  const before = rangeText(segments, Math.max(0, startSec - padSec), startSec);
  const clip = rangeText(segments, startSec, endSec);
  const after = rangeText(segments, endSec, endSec + padSec);
  return {
    before,
    clip,
    after,
    combined: normalizeText(`${before} ${clip} ${after}`),
  };
}

function scoreType(
  rule: TypeRule,
  ctx: ClipTranscriptContext,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  for (const re of rule.clipPatterns) {
    if (re.test(ctx.clip)) {
      score += 14 * rule.weight;
      reasons.push(`Clip: ${re.source.slice(0, 40)}`);
    }
  }
  for (const re of rule.contextPatterns ?? []) {
    if (re.test(ctx.combined)) {
      score += 6 * rule.weight;
      reasons.push(`Context: ${re.source.slice(0, 40)}`);
    }
  }
  for (const re of rule.clipPatterns) {
    if (!re.test(ctx.clip) && re.test(ctx.before)) {
      score += 4;
      reasons.push("Lead-in context");
      break;
    }
  }

  if (rule.type === "Commercial" && extractBrandFromText(ctx.combined)) {
    score += 18;
    reasons.push("Brand detected");
  }

  return { score, reasons };
}

function matchLexicon(
  lexicon: { match: RegExp; name: string }[],
  text: string,
): string | null {
  for (const { match, name } of lexicon) {
    if (match.test(text)) return name;
  }
  return null;
}

function extractAfterPattern(text: string, pattern: RegExp): string | null {
  const m = text.match(pattern);
  if (!m?.[1]) return null;
  return cleanSubject(m[1]);
}

function cleanSubject(raw: string): string | null {
  const t = normalizeText(raw)
    .replace(/^(?:the|a|an)\s+/i, "")
    .replace(/[,.!?;:]+$/g, "")
    .trim();
  if (t.length < 2) return null;
  const words = t.split(/\s+/).slice(0, 5);
  if (words.every((w) => STOP_WORDS.has(w.toLowerCase()))) return null;
  return titleCase(words.join(" "));
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => {
      if (/^(II|III|IV|U2|R\.?\s*Kelly)$/i.test(w)) return w.toUpperCase().replace(/\s+/g, "");
      if (w.length <= 3 && w === w.toUpperCase()) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function extractProperNames(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(
    /\b(?:the\s+)?([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|II|III|IV|&)){0,4})\b/g,
  )) {
    const candidate = cleanSubject(m[1] ?? m[0]);
    if (candidate && candidate.length >= 3) found.push(candidate);
  }
  return found;
}

function extractSubject(
  type: ContentType,
  ctx: ClipTranscriptContext,
  ocr?: ClipOcrInput | null,
): string {
  const hay = normalizeText(`${ctx.clip} ${ctx.before} ${ctx.after}`);

  if (type === "Commercial") {
    return (
      extractBrandFromText(ctx.clip) ??
      extractBrandFromText(hay) ??
      ocr?.primarySubject ??
      extractAfterPattern(hay, /\b(?:try|discover|introducing)\s+(.{3,40}?)(?:\.|,|$)/i) ??
      "Spot"
    );
  }

  if (type === "Movie Trailer") {
    return (
      matchLexicon(MOVIE_LEXICON, hay) ??
      extractAfterPattern(hay, /\bstarring\s+(.{3,50}?)(?:\.|,|$)/i) ??
      extractAfterPattern(hay, /\btrailer\s+for\s+(?:the\s+)?(.{3,50}?)(?:\.|,|$)/i) ??
      extractProperNames(hay)[0] ??
      "Feature"
    );
  }

  if (type === "Promo") {
    return (
      matchLexicon(SHOW_PROMO_LEXICON, hay) ??
      extractAfterPattern(hay, /\b(?:coming\s+up|next\s+on|don't\s+miss)\s+(?:on\s+)?(.{3,40}?)(?:\.|,|$)/i) ??
      extractProperNames(hay)[0] ??
      "Segment"
    );
  }

  if (type === "Award") {
    return (
      extractAfterPattern(hay, /\b(?:award\s+for|present(?:ing)?\s+(?:the\s+)?)(.{3,50}?)(?:\.|,|$)/i) ??
      extractAfterPattern(hay, /\b(?:top|best)\s+(.{3,40}?)(?:\.|,|$)/i) ??
      extractAfterPattern(hay, /\b(?:female|male)\s+(.{3,40}?)(?:\.|,|$)/i) ??
      "Category"
    );
  }

  if (type === "Acceptance Speech") {
    return (
      matchLexicon(PERFORMER_LEXICON, hay) ??
      ocr?.primarySubject ??
      extractAfterPattern(hay, /\b(?:thank\s+you,?\s+)(?:i'm\s+)?(.{3,40}?)(?:\.|,|$)/i) ??
      extractProperNames(hay)[0] ??
      "Artist"
    );
  }

  if (type === "Presenter") {
    return (
      matchLexicon(PERFORMER_LEXICON, hay) ??
      extractAfterPattern(hay, /\bplease\s+welcome\s+(.{3,50}?)(?:\.|,|$)/i) ??
      extractAfterPattern(hay, /\bhere\s+to\s+present\s+(?:is\s+)?(.{3,50}?)(?:\.|,|$)/i) ??
      extractProperNames(hay)[0] ??
      ocr?.primarySubject ??
      "Host"
    );
  }

  if (type === "Performance") {
    return (
      matchLexicon(PERFORMER_LEXICON, hay) ??
      ocr?.primarySubject ??
      extractAfterPattern(hay, /\bperformance\s+by\s+(.{3,50}?)(?:\.|,|$)/i) ??
      extractAfterPattern(hay, /\bplease\s+welcome\s+(.{3,50}?)(?:\.|,|$)/i) ??
      extractAfterPattern(hay, /\b(?:singing|performing)\s+(.{3,50}?)(?:\.|,|$)/i) ??
      extractProperNames(hay)[0] ??
      ocr?.subjects[0] ??
      "Artist"
    );
  }

  if (type === "Interview") {
    return (
      matchLexicon(PERFORMER_LEXICON, hay) ??
      extractAfterPattern(hay, /\b(?:talk(?:ing)?\s+(?:with|to)|join(?:ing)?)\s+(.{3,50}?)(?:\.|,|$)/i) ??
      extractProperNames(hay)[0] ??
      "Guest"
    );
  }

  if (type === "News") {
    return (
      extractAfterPattern(hay, /\b(?:report(?:ing)?\s+(?:from|on)\s+)(.{3,50}?)(?:\.|,|$)/i) ??
      extractAfterPattern(hay, /\b(?:this\s+is\s+)(.{3,40}?)(?:\.|,|$)/i) ??
      "Report"
    );
  }

  if (type === "Station ID") {
    const net = hay.match(/\b(ABC|NBC|CBS|FOX|BBC)\b/i);
    return net ? net[1].toUpperCase() : "Network";
  }

  return extractProperNames(hay)[0] ?? ocr?.primarySubject ?? "Segment";
}

function isGenericSubject(subject: string): boolean {
  return /^(Host|Artist|Segment|Guest|Spot|Feature|Category|Report|Network)$/i.test(
    subject.trim(),
  );
}

/** Merge transcript classification with on-screen OCR text. */
export function applyOcrToSuggestion(
  type: ContentType,
  subject: string,
  ctx: ClipTranscriptContext,
  ocr: ClipOcrInput | null | undefined,
): { type: ContentType; subject: string; reasons: string[]; confidenceBoost: number } {
  const reasons: string[] = [];
  let confidenceBoost = 0;
  if (!ocr?.primarySubject) {
    return { type, subject, reasons, confidenceBoost };
  }

  const ocrSubject = ocr.primarySubject;
  const hay = ctx.combined;
  const transcriptArtist = matchLexicon(PERFORMER_LEXICON, hay);
  const introLanguage = /\b(?:ladies\s+and\s+gentlemen|please\s+welcome|put\s+your\s+hands)\b/i.test(
    hay,
  );

  if (
    introLanguage &&
    !transcriptArtist &&
    (type === "Presenter" || isGenericSubject(subject))
  ) {
    reasons.push(`OCR on-screen: ${ocrSubject}`);
    confidenceBoost += 16;
    return { type: "Performance", subject: ocrSubject, reasons, confidenceBoost };
  }

  if (isGenericSubject(subject) || subject === "Artist") {
    reasons.push(`OCR on-screen: ${ocrSubject}`);
    confidenceBoost += 12;
    return { type, subject: ocrSubject, reasons, confidenceBoost };
  }

  if (ocrSubject.toLowerCase() === subject.toLowerCase()) {
    reasons.push("OCR confirms subject");
    confidenceBoost += 10;
  } else if (
    ocr.subjects.some((s) => s.toLowerCase() === subject.toLowerCase())
  ) {
    reasons.push("OCR matches subject");
    confidenceBoost += 8;
  }

  return { type, subject, reasons, confidenceBoost };
}

export function formatTypedTitle(type: ContentType, subject: string): string {
  return `${type} - ${subject}`;
}

export function parseTypedTitle(title: string): { type: ContentType | null; subject: string } {
  const trimmed = title.trim();
  for (const type of CONTENT_TYPES) {
    const prefix = `${type} - `;
    if (trimmed.startsWith(prefix)) {
      return { type, subject: trimmed.slice(prefix.length).trim() || "Segment" };
    }
  }
  return { type: null, subject: trimmed };
}

function confidenceFromScore(topScore: number, secondScore: number, hasSubject: boolean): number {
  let confidence = 42 + topScore * 0.9;
  if (topScore - secondScore >= 12) confidence += 10;
  if (topScore - secondScore >= 24) confidence += 8;
  if (hasSubject) confidence += 12;
  if (topScore < 8) confidence = 38;
  return Math.min(98, Math.max(35, Math.round(confidence)));
}

export function suggestClipTag(
  chapter: Pick<EditorialChapter, "startSec" | "endSec" | "title">,
  segments: TranscriptSegment[],
  ocr?: ClipOcrInput | null,
): ClipTagSuggestion {
  const ctx = clipTranscriptContext(segments, chapter.startSec, chapter.endSec);
  const scored = TYPE_RULES.map((rule) => {
    const { score, reasons } = scoreType(rule, ctx);
    return { type: rule.type, score, reasons };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1] ?? { score: 0 };
  let type: ContentType = top?.score > 0 ? top.type : "Promo";

  const parsed = parseTypedTitle(chapter.title);
  if (parsed.type && top.score < 10) {
    type = parsed.type;
  }

  let subject = extractSubject(type, ctx, ocr);
  const ocrMerge = applyOcrToSuggestion(type, subject, ctx, ocr);
  type = ocrMerge.type;
  subject = ocrMerge.subject;

  const title = formatTypedTitle(type, subject);
  const reasons = [...(top?.reasons?.slice(0, 3) ?? []), ...ocrMerge.reasons].slice(0, 5);
  if (!ctx.clip) reasons.push("No in-clip transcript");

  let confidence = confidenceFromScore(
    top?.score ?? 0,
    second.score,
    subject.length > 3 && !isGenericSubject(subject),
  );
  confidence = Math.min(98, confidence + ocrMerge.confidenceBoost);

  return {
    type,
    subject,
    title,
    confidence,
    reasons,
    ocrSubject: ocr?.primarySubject ?? null,
  };
}

export function suggestAllChapterTags(
  chapters: EditorialChapter[],
  segments: TranscriptSegment[],
  ocrByChapter?: Map<string, ClipOcrInput>,
): Map<string, ClipTagSuggestion> {
  const out = new Map<string, ClipTagSuggestion>();
  for (const ch of chapters) {
    out.set(ch.id, suggestClipTag(ch, segments, ocrByChapter?.get(ch.id) ?? null));
  }
  return out;
}
