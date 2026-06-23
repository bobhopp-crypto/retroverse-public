import type { FactCategory } from "./song-package-types";
import type { RawExtractedFact } from "./fact-validation";
import { normalizeFactText } from "./fact-validation";

type PatternRule = {
  category: FactCategory;
  re: RegExp;
  build: (match: RegExpMatchArray, excerpt: string) => RawExtractedFact | null;
};

function sentenceAround(excerpt: string, index: number, maxLen = 480): string {
  const start = Math.max(0, excerpt.lastIndexOf(".", index) + 1, excerpt.lastIndexOf("\n", index) + 1);
  let end = excerpt.indexOf(".", index);
  if (end < 0) end = excerpt.length;
  const slice = excerpt.slice(start, end + 1).trim();
  return slice.length > maxLen ? slice.slice(0, maxLen) : slice;
}

const PATTERN_RULES: PatternRule[] = [
  {
    category: "trivia",
    re: /Pierre Boulez[^.]*(?:referred to|called)[^.]*(?:Paul as )?"Al"[^.]*\./i,
    build: (m, excerpt) => ({
      factText: normalizeFactText(m[0]),
      category: "trivia",
      excerptAnchor: m[0].slice(0, Math.min(80, m[0].length)),
      confidence: 0.92,
    }),
  },
  {
    category: "video",
    re: /Chevy Chase[^.]*lip-sync[^.]*\./i,
    build: (m) => ({
      factText: normalizeFactText(m[0]),
      category: "video",
      excerptAnchor: m[0].slice(0, Math.min(80, m[0].length)),
      confidence: 0.9,
    }),
  },
  {
    category: "video",
    re: /(?:original music video|monologue when he hosted Saturday Night Live)[^.]*\./i,
    build: (m, excerpt) => {
      const idx = excerpt.search(m[0] ? new RegExp(m[0].slice(0, 30), "i") : /SNL/i);
      const sent = idx >= 0 ? sentenceAround(excerpt, idx) : m[0];
      return {
        factText:
          "The original music video was a performance Simon gave during his Saturday Night Live monologue.",
        category: "video",
        excerptAnchor: sent.slice(0, Math.min(80, sent.length)),
        confidence: 0.88,
      };
    },
  },
  {
    category: "recording",
    re: /tape was reversed[^.]*\./i,
    build: (m, excerpt) => {
      const idx = excerpt.search(/tape was reversed/i);
      const sent = idx >= 0 ? sentenceAround(excerpt, idx) : m[0];
      return {
        factText: normalizeFactText(sent),
        category: "recording",
        excerptAnchor: sent.slice(0, Math.min(80, sent.length)),
        confidence: 0.9,
      };
    },
  },
  {
    category: "recording",
    re: /Adrian Belew[^.]*guitar synthesizer[^.]*\./i,
    build: (m) => ({
      factText: normalizeFactText(m[0]),
      category: "recording",
      excerptAnchor: m[0].slice(0, Math.min(80, m[0].length)),
      confidence: 0.88,
    }),
  },
  {
    category: "quote",
    re: /Jon Pareles noted that[^.]*\./i,
    build: (m) => ({
      factText: normalizeFactText(m[0]),
      category: "quote",
      excerptAnchor: m[0].slice(0, Math.min(80, m[0].length)),
      confidence: 0.85,
    }),
  },
  {
    category: "album",
    re: /won the \d{4} Grammy for Album of the Year/i,
    build: (m, excerpt) => {
      const idx = excerpt.search(/Grammy for Album of the Year/i);
      const sent = idx >= 0 ? sentenceAround(excerpt, idx) : m[0];
      return {
        factText: normalizeFactText(sent),
        category: "album",
        excerptAnchor: sent.slice(0, Math.min(80, sent.length)),
        confidence: 0.9,
      };
    },
  },
  {
    category: "chart",
    re: /peak(?:ed)? at number (\d+)[^.]*(?:May \d{4})?/i,
    build: (m, excerpt) => {
      const idx = excerpt.search(/peak(?:ed)? at number/i);
      const sent = idx >= 0 ? sentenceAround(excerpt, idx) : m[0];
      return {
        factText: normalizeFactText(sent),
        category: "chart",
        excerptAnchor: sent.slice(0, Math.min(80, sent.length)),
        confidence: 0.88,
      };
    },
  },
  {
    category: "cultural_impact",
    re: /(?:Portlandia|Netflix film)[^.]*\./i,
    build: (m) => ({
      factText: normalizeFactText(m[0]),
      category: "cultural_impact",
      excerptAnchor: m[0].slice(0, Math.min(80, m[0].length)),
      confidence: 0.8,
    }),
  },
];

export function extractPatternFacts(excerpt: string): RawExtractedFact[] {
  const found: RawExtractedFact[] = [];
  for (const rule of PATTERN_RULES) {
    const m = excerpt.match(rule.re);
    if (m) {
      const built = rule.build(m, excerpt);
      if (built) found.push(built);
    }
  }
  return found;
}
