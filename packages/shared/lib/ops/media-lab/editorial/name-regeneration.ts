import type { TranscriptSegment } from "../build-chapters-from-segments";
import { extractBrandFromText } from "../commercial/brand-detect";

import {
  clipTranscriptContext,
  isGenericSubject,
  parseTypedTitle,
  scoreContentTypes,
  suggestClipTag,
  type ClipOcrInput,
  type ClipTagSuggestion,
  type ContentType,
} from "./transcript-suggestions";

export const MIN_NAME_REGENERATIONS = 5;

export type NameCandidate = {
  name: string;
  confidence: number;
  source: string;
  tier: "primary" | "alternate" | "descriptive";
};

export type RegenerateClipNameInput = {
  startSec: number;
  endSec: number;
  title: string;
  segments: TranscriptSegment[];
  ocr?: ClipOcrInput | null;
  /** Normalized names already shown this session (current + history). */
  usedNames: Set<string>;
  /** Zero-based regeneration pass count for this clip. */
  regenPass: number;
};

export type RegenerateClipNameResult = {
  name: string;
  suggestion: ClipTagSuggestion;
  source: string;
  exhausted: boolean;
};

export function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function displayNameFromTitle(title: string): string {
  const parsed = parseTypedTitle(title);
  return parsed.subject.trim() || title.trim();
}

function pushCandidate(
  list: NameCandidate[],
  seen: Set<string>,
  name: string,
  confidence: number,
  source: string,
  tier: NameCandidate["tier"],
): void {
  const cleaned = name.trim();
  if (!cleaned) return;
  const key = normalizeNameKey(cleaned);
  if (seen.has(key)) return;
  seen.add(key);
  list.push({ name: cleaned, confidence, source, tier });
}

function descriptiveNames(type: ContentType, subject?: string): string[] {
  const s = subject?.trim();
  const hasSubject = s && !isGenericSubject(s);

  if (type === "Commercial") {
    return hasSubject
      ? [`${s} Ad`, `${s} Commercial`, `${s} TV Spot`, "TV Spot", "Commercial"]
      : ["TV Spot", "Commercial", "Ad Spot"];
  }
  if (type === "Promo") {
    return hasSubject ? [`${s} Promo`, "Show Promo", "Promo"] : ["Show Promo", "Promo"];
  }
  if (type === "Performance") {
    return hasSubject ? [`${s} Performance`, "Live Performance"] : ["Live Performance", "Performance"];
  }
  if (type === "Award") {
    return hasSubject ? [`${s} Award`, "Award Moment"] : ["Award Moment", "Award Segment"];
  }
  if (type === "Acceptance Speech") {
    return hasSubject ? [`${s} Speech`, "Acceptance Speech"] : ["Acceptance Speech"];
  }
  if (type === "Presenter") {
    return hasSubject ? [`${s} Intro`, "Presenter Intro"] : ["Presenter Intro"];
  }
  if (type === "Interview") {
    return hasSubject ? [`${s} Interview`, "Interview Clip"] : ["Interview Clip"];
  }
  if (type === "Movie Trailer") {
    return hasSubject ? [`${s} Trailer`, "Movie Trailer"] : ["Movie Trailer"];
  }
  if (type === "News") {
    return hasSubject ? [`${s} News`, "News Segment"] : ["News Segment"];
  }
  if (type === "Station ID") {
    return ["Station ID", "Network ID"];
  }
  return hasSubject ? [`${s} Clip`, "Segment"] : ["Segment"];
}

/** Fresh multi-source candidate pass — never cached between calls. */
export function collectNameCandidates(input: RegenerateClipNameInput): NameCandidate[] {
  const { startSec, endSec, title, segments, ocr } = input;
  const chapter = { startSec, endSec, title };
  const ctx = clipTranscriptContext(segments, startSec, endSec);
  const base = suggestClipTag(chapter, segments, ocr);
  const lowConfidence = base.confidence < 55;
  const candidates: NameCandidate[] = [];
  const seen = new Set<string>();

  pushCandidate(candidates, seen, base.subject, base.confidence, "Primary transcript/OCR", "primary");

  for (const { type, score } of scoreContentTypes(segments, startSec, endSec).slice(0, 6)) {
    if (type === base.type) continue;
    const alt = suggestClipTag(chapter, segments, ocr, type);
    if (isGenericSubject(alt.subject)) continue;
    pushCandidate(
      candidates,
      seen,
      alt.subject,
      Math.min(base.confidence - 4, Math.round(40 + score * 0.7)),
      `Alternate type: ${type}`,
      "alternate",
    );
  }

  if (ocr?.primarySubject) {
    pushCandidate(candidates, seen, ocr.primarySubject, base.confidence - 2, "OCR primary", "alternate");
  }
  for (const subj of ocr?.subjects ?? []) {
    pushCandidate(candidates, seen, subj, base.confidence - 6, "OCR subject", "alternate");
  }

  for (const region of [ctx.clip, ctx.before, ctx.after, ctx.combined]) {
    const brand = extractBrandFromText(region);
    if (brand) {
      pushCandidate(candidates, seen, brand, base.confidence - 3, "Brand detection", "alternate");
    }
  }

  for (const region of [ctx.clip, ctx.before, ctx.after]) {
    for (const m of region.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g)) {
      const word = m[1]?.trim();
      if (!word || word.length < 4) continue;
      pushCandidate(candidates, seen, word, 44, "Proper name in transcript", "alternate");
    }
  }

  for (const desc of descriptiveNames(base.type, base.subject)) {
    pushCandidate(
      candidates,
      seen,
      desc,
      lowConfidence ? base.confidence + 2 : base.confidence - 10,
      "Descriptive label",
      "descriptive",
    );
  }

  for (const { type } of scoreContentTypes(segments, startSec, endSec).slice(1, 4)) {
    for (const desc of descriptiveNames(type)) {
      pushCandidate(candidates, seen, desc, 40, `Descriptive (${type})`, "descriptive");
    }
  }

  candidates.sort((a, b) => {
    if (lowConfidence) {
      const tierRank = { descriptive: 0, primary: 1, alternate: 2 };
      const td = tierRank[a.tier] - tierRank[b.tier];
      if (td !== 0) return td;
    } else {
      const tierRank = { primary: 0, alternate: 1, descriptive: 2 };
      const td = tierRank[a.tier] - tierRank[b.tier];
      if (td !== 0) return td;
    }
    return b.confidence - a.confidence;
  });

  return candidates;
}

export function regenerateClipName(input: RegenerateClipNameInput): RegenerateClipNameResult | null {
  const candidates = collectNameCandidates(input);
  if (candidates.length === 0) return null;

  const unused = candidates.filter((c) => !input.usedNames.has(normalizeNameKey(c.name)));
  const pool = unused.length > 0 ? unused : candidates;
  const pick = pool[input.regenPass % pool.length];
  if (!pick) return null;

  const chapter = { startSec: input.startSec, endSec: input.endSec, title: input.title };
  const suggestion = suggestClipTag(chapter, input.segments, input.ocr);
  suggestion.subject = pick.name;
  suggestion.title = pick.name;
  if (pick.tier === "descriptive" || pick.source.startsWith("Descriptive")) {
    suggestion.confidence = Math.min(suggestion.confidence, 52);
  }

  return {
    name: pick.name,
    suggestion,
    source: pick.source,
    exhausted: unused.length === 0,
  };
}
