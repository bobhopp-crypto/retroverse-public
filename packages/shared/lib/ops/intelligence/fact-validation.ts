import type { FactCategory, SongPackageMetadata } from "./song-package-types";
import {
  canonSnapshotFromMetadata,
  conflictsWithCanon,
  scoreAgainstCanon,
} from "./canon-priority";

/** Block poetic / hallucinated phrasing in extracted facts. */
export const POETRY_BLOCKLIST = [
  /in minor key/i,
  /looping through/i,
  /breaks the silence/i,
  /silly little song/i,
  /inflatable chicken/i,
  /flaming torch/i,
  /couch potato/i,
  /midlife crisis in/i,
  /melancholy/i,
  /crackle of tape/i,
  /imagine the/i,
];

export type RawExtractedFact = {
  factText: string;
  category: FactCategory;
  excerptAnchor: string;
  confidence: number;
};

export function normalizeFactText(text: string): string {
  let t = text.trim().replace(/\s+/g, " ");
  if (t && !/[.!?]$/.test(t)) t += ".";
  return t;
}

export function anchorInExcerpt(anchor: string, excerpt: string): boolean {
  const a = anchor.trim();
  if (!a || a.length < 8) return false;
  return excerpt.includes(a);
}

export function passesPoetryFilter(text: string): boolean {
  return !POETRY_BLOCKLIST.some((re) => re.test(text));
}

/** Chart numbers in fact text must match canonical peak when present. */
export function chartFactMatchesCanonical(
  factText: string,
  metadata: SongPackageMetadata,
): boolean {
  return !conflictsWithCanon(factText, canonSnapshotFromMetadata(metadata));
}

export function dedupeFacts(facts: RawExtractedFact[]): RawExtractedFact[] {
  const out: RawExtractedFact[] = [];
  for (const f of facts) {
    const norm = f.factText.toLowerCase();
    const dup = out.some((existing) => {
      const a = existing.factText.toLowerCase();
      return a === norm || a.includes(norm) || norm.includes(a);
    });
    if (!dup) out.push(f);
  }
  return out;
}

export function sourceTrust(confidence: number): number {
  return Math.min(1, Math.max(0, confidence));
}

export function computeFactConfidence(
  modelConfidence: number,
  sourceConfidence: number,
  anchorOk: boolean,
  metadata?: SongPackageMetadata,
  factText?: string,
): number {
  const anchorFactor = anchorOk ? 1 : 0.5;
  let base = Math.min(1, modelConfidence * sourceConfidence * anchorFactor);
  if (metadata && factText) {
    base = scoreAgainstCanon(base, factText, canonSnapshotFromMetadata(metadata));
  }
  return base;
}
