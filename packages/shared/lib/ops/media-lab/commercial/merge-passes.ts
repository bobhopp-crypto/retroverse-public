import {
  brandsMatchText,
  extractBrandFromText,
  isContinuationFragment,
  transcriptSimilarity,
} from "./brand-detect";

export type CommercialBlock = {
  start: number;
  end: number;
  texts: string[];
};

export const HARD_BREAK_GAP_SEC = 5;
export const SOFT_BREAK_GAP_SEC = 3.5;
export const TRANSCRIPT_MERGE_THRESHOLD = 0.26;
export const MAX_COMMERCIAL_SEC = 120;
export const TARGET_MAX_SEC = 90;

export function blockText(block: CommercialBlock): string {
  return block.texts.join(" ").replace(/\s+/g, " ").trim();
}

export function blockDuration(block: CommercialBlock): number {
  return block.end - block.start;
}

export function mergeBlock(into: CommercialBlock, from: CommercialBlock): void {
  into.end = from.end;
  into.texts.push(...from.texts);
}

export function gapBetween(a: CommercialBlock, b: CommercialBlock): number {
  return Math.max(0, b.start - a.end);
}

export function shouldPersistMerge(a: CommercialBlock, b: CommercialBlock): boolean {
  const textA = blockText(a);
  const textB = blockText(b);
  const combined = blockDuration(a) + blockDuration(b);
  if (combined > MAX_COMMERCIAL_SEC) return false;

  if (brandsMatchText(textA, textB)) return true;
  if (isContinuationFragment(textA, textB)) return true;
  if (transcriptSimilarity(textA, textB) >= TRANSCRIPT_MERGE_THRESHOLD) return true;

  const brand = extractBrandFromText(`${textA} ${textB}`);
  if (brand && (extractBrandFromText(textA) === brand || extractBrandFromText(textB) === brand)) {
    return true;
  }

  return false;
}

export function mergeAdjacentPersistent(blocks: CommercialBlock[]): CommercialBlock[] {
  if (blocks.length <= 1) return blocks;

  const out: CommercialBlock[] = [{ ...blocks[0], texts: [...blocks[0].texts] }];
  for (let i = 1; i < blocks.length; i++) {
    const prev = out[out.length - 1];
    const cur = { ...blocks[i], texts: [...blocks[i].texts] };
    if (shouldPersistMerge(prev, cur)) {
      mergeBlock(prev, cur);
      continue;
    }
    out.push(cur);
  }
  return out;
}

export function mergeUntilStable(blocks: CommercialBlock[]): CommercialBlock[] {
  let out = blocks;
  for (let pass = 0; pass < 12; pass++) {
    const next = mergeAdjacentPersistent(out);
    if (next.length === out.length) break;
    out = next;
  }
  return out;
}
