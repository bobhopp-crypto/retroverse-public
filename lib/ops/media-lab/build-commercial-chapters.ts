/**
 * Commercial compilation mode — fewer, longer clips for vintage ad reels.
 */

import type { ContentChapter, TranscriptSegment } from "./build-chapters-from-segments";

const MIN_DURATION_SEC = 20;
const TARGET_MIN_SEC = 30;
const TARGET_MAX_SEC = 90;
/** Pause between Whisper lines → likely next commercial. */
const COMMERCIAL_BREAK_GAP_SEC = 2.2;

const BRAND_LEXICON: { match: RegExp; name: string }[] = [
  { match: /\bcover\s*girl|covergirl\b/i, name: "Covergirl" },
  { match: /\braintree|rayntree\b/i, name: "Raintree" },
  { match: /\bmichelin\b/i, name: "Michelin" },
  { match: /\byamaha\b/i, name: "Yamaha" },
  { match: /\bporsche\b/i, name: "Porsche" },
  { match: /\baudi\b/i, name: "Audi" },
  { match: /\bchevrolet|chevy\b/i, name: "Chevrolet" },
  { match: /\bford\b/i, name: "Ford" },
  { match: /\btoyota\b/i, name: "Toyota" },
  { match: /\bhonda\b/i, name: "Honda" },
  { match: /\bmercedes\b/i, name: "Mercedes" },
  { match: /\bvolkswagen|vw\b/i, name: "Volkswagen" },
  { match: /\bcoca[\s-]?cola\b/i, name: "Coca-Cola" },
  { match: /\bpepsi\b/i, name: "Pepsi" },
  { match: /\b7[\s-]?up\b/i, name: "7-Up" },
  { match: /\bdr\.?\s*pepper\b/i, name: "Dr Pepper" },
  { match: /\britz\b/i, name: "Ritz" },
  { match: /\brice\s+krispies\b/i, name: "Rice Krispies" },
  { match: /\bkellogg'?s?\b/i, name: "Kellogg's" },
  { match: /\bquaker\s+oats\b/i, name: "Quaker Oats" },
  { match: /\bgeneral\s+mills\b/i, name: "General Mills" },
  { match: /\bbetty\s+crocker\b/i, name: "Betty Crocker" },
  { match: /\bcampbell'?s?\b/i, name: "Campbell's" },
  { match: /\bjell[\s-]?o\b/i, name: "Jell-O" },
  { match: /\bwonder\s+bread\b/i, name: "Wonder Bread" },
  { match: /\bmaxwell\s+house\b/i, name: "Maxwell House" },
  { match: /\bfolgers\b/i, name: "Folgers" },
  { match: /\bnescafe\b/i, name: "Nescafe" },
  { match: /\bgillette\b/i, name: "Gillette" },
  { match: /\bcolgate\b/i, name: "Colgate" },
  { match: /\bcrest\b/i, name: "Crest" },
  { match: /\bolay\b/i, name: "Olay" },
  { match: /\bprocter\s*(?:&|and)\s*gamble\b/i, name: "Procter & Gamble" },
  { match: /\btide\b/i, name: "Tide" },
  { match: /\bcharmin\b/i, name: "Charmin" },
  { match: /\bbounty\b/i, name: "Bounty" },
  { match: /\bpampers\b/i, name: "Pampers" },
  { match: /\bkleenex\b/i, name: "Kleenex" },
  { match: /\bscott\b/i, name: "Scott" },
  { match: /\bge\b/i, name: "GE" },
  { match: /\bat\s*&\s*t\b/i, name: "AT&T" },
  { match: /\bmcdonald'?s?\b/i, name: "McDonald's" },
  { match: /\bburger\s+king\b/i, name: "Burger King" },
  { match: /\bkfc\b/i, name: "KFC" },
  { match: /\bpizza\s+hut\b/i, name: "Pizza Hut" },
  { match: /\bmarlboro\b/i, name: "Marlboro" },
  { match: /\bvirginia\s+slims\b/i, name: "Virginia Slims" },
  { match: /\bwinston\b/i, name: "Winston" },
  { match: /\bmerrell\b/i, name: "Merrell" },
  { match: /\bnike\b/i, name: "Nike" },
  { match: /\badidas\b/i, name: "Adidas" },
  { match: /\bibm\b/i, name: "IBM" },
  { match: /\bsony\b/i, name: "Sony" },
  { match: /\bpanasonic\b/i, name: "Panasonic" },
  { match: /\bzenith\b/i, name: "Zenith" },
  { match: /\brca\b/i, name: "RCA" },
  { match: /\bmiller\b/i, name: "Miller" },
  { match: /\bbudweiser|bud\s+light\b/i, name: "Budweiser" },
  { match: /\bstouffer'?s?\b/i, name: "Stouffer's" },
  { match: /\bhunt'?s?\b/i, name: "Hunt's" },
  { match: /\bheinz\b/i, name: "Heinz" },
  { match: /\boscar\s+mayer\b/i, name: "Oscar Mayer" },
  { match: /\barm\s*&\s*hammer\b/i, name: "Arm & Hammer" },
  { match: /\bclorox\b/i, name: "Clorox" },
  { match: /\blysol\b/i, name: "Lysol" },
  { match: /\bdowny\b/i, name: "Downy" },
  { match: /\bsprint\b/i, name: "Sprint" },
  { match: /\bverizon\b/i, name: "Verizon" },
  { match: /\benergizer\b/i, name: "Energizer" },
  { match: /\bduracell\b/i, name: "Duracell" },
  { match: /\bpolaroid\b/i, name: "Polaroid" },
  { match: /\bkodak\b/i, name: "Kodak" },
  { match: /\bmaybelline\b/i, name: "Maybelline" },
  { match: /\brevlon\b/i, name: "Revlon" },
  { match: /\bestee\s+lauder\b/i, name: "Estee Lauder" },
  { match: /\bchrysler\b/i, name: "Chrysler" },
  { match: /\bplymouth\b/i, name: "Plymouth" },
  { match: /\bdodge\b/i, name: "Dodge" },
  { match: /\bamc\b/i, name: "AMC" },
  { match: /\bbuick\b/i, name: "Buick" },
  { match: /\boldsmobile\b/i, name: "Oldsmobile" },
  { match: /\bpontiac\b/i, name: "Pontiac" },
  { match: /\bcadillac\b/i, name: "Cadillac" },
  { match: /\blincoln\b/i, name: "Lincoln" },
  { match: /\bmercury\b/i, name: "Mercury" },
];

const NETWORK_BREAK_RE =
  /\b(NBC|CBS|ABC|BBC|FOX)\b.*\b(ident|station|network|we(?:'ll| will)\s+return|stay\s+tuned)\b/i;

const FILLER_WORDS = new Set([
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
  "new",
  "try",
  "get",
  "its",
  "it's",
  "you",
  "are",
  "have",
  "has",
  "was",
  "can",
  "all",
  "more",
  "only",
  "just",
  "when",
  "where",
  "what",
  "who",
  "how",
  "here",
  "there",
  "today",
  "tonight",
  "available",
  "discover",
  "introducing",
  "presenting",
]);

type RawBlock = {
  start: number;
  end: number;
  texts: string[];
  key: string;
};

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractBrandName(text: string): string | null {
  for (const { match, name } of BRAND_LEXICON) {
    if (match.test(text)) return name;
  }
  const sponsored = text.match(
    /\b(?:brought\s+to\s+you\s+by|sponsored\s+by)\s+([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+){0,2})/,
  );
  if (sponsored?.[1]) return sponsored[1].trim();

  const product = text.match(
    /\b(?:new|try|introducing)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
  );
  if (product?.[1]) return product[1].trim();

  return null;
}

function extractIdentityKey(text: string): string {
  const brand = extractBrandName(text);
  if (brand) return brand.toLowerCase();

  const words = normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !FILLER_WORDS.has(w));

  if (words.length >= 2) return words.slice(0, 3).join(" ");
  if (words.length === 1) return words[0];
  return "unknown";
}

function keysMatch(a: string, b: string): boolean {
  if (a === b) return true;
  return false;
}

function blockBrand(block: RawBlock): string | null {
  return extractBrandName(blockText(block));
}

function brandsMatch(a: RawBlock, b: RawBlock): boolean {
  const ba = blockBrand(a);
  const bb = blockBrand(b);
  if (ba && bb) return ba === bb;
  return keysMatch(a.key, b.key) && a.key !== "unknown";
}

function blockDuration(block: RawBlock): number {
  return block.end - block.start;
}

function blockText(block: RawBlock): string {
  return normalizeText(block.texts.join(" "));
}

function titleForBlock(block: RawBlock): string {
  const text = blockText(block);
  const brand = extractBrandName(text);
  if (brand) return `Commercial - ${brand}`;

  if (NETWORK_BREAK_RE.test(text)) {
    const net = text.match(/\b(NBC|CBS|ABC|BBC|FOX)\b/i);
    return net ? `Commercial - ${net[1].toUpperCase()} Network` : "Commercial - Network";
  }

  const words = normalizeText(text)
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !FILLER_WORDS.has(w.toLowerCase()));

  const proper = words.filter((w) => /^[A-Z]/.test(w)).slice(0, 4);
  if (proper.length >= 2) {
    return `Commercial - ${proper.join(" ")}`;
  }

  if (block.key === "unknown") return "Commercial - Spot";
  return `Commercial - ${block.key.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
}

function groupSegments(segments: TranscriptSegment[]): RawBlock[] {
  const blocks: RawBlock[] = [];
  let cur: RawBlock | null = null;
  let prevEnd = 0;

  for (const seg of segments) {
    const text = normalizeText(seg.text);
    if (!text) continue;

    const key = extractIdentityKey(text);
    const gap = cur ? Math.max(0, seg.start - prevEnd) : 0;

    const pauseBreak = cur && gap >= COMMERCIAL_BREAK_GAP_SEC;

    if (!cur) {
      cur = { start: seg.start, end: seg.end, texts: [text], key };
      if (key !== "unknown") cur.key = key;
    } else if (pauseBreak) {
      blocks.push(cur);
      cur = { start: seg.start, end: seg.end, texts: [text], key };
      if (key !== "unknown") cur.key = key;
    } else {
      cur.end = seg.end;
      cur.texts.push(text);
      if (key !== "unknown") cur.key = key;
    }

    prevEnd = seg.end;
  }

  if (cur) blocks.push(cur);
  return blocks;
}

function mergeAdjacentSameBrand(blocks: RawBlock[]): RawBlock[] {
  if (blocks.length <= 1) return blocks;

  const out: RawBlock[] = [{ ...blocks[0], texts: [...blocks[0].texts] }];
  for (let i = 1; i < blocks.length; i++) {
    const prev = out[out.length - 1];
    const cur = blocks[i];
    const combined = blockDuration(prev) + blockDuration(cur);
    if (brandsMatch(prev, cur) && combined <= TARGET_MAX_SEC) {
      mergeBlock(prev, cur);
      continue;
    }
    out.push({ ...cur, texts: [...cur.texts] });
  }
  return out;
}

function mergeBlock(into: RawBlock, from: RawBlock): void {
  into.end = from.end;
  into.texts.push(...from.texts);
  if (from.key !== "unknown") into.key = from.key;
}

function enforceMinDuration(blocks: RawBlock[]): RawBlock[] {
  if (blocks.length <= 1) return blocks;

  const out = blocks.map((b) => ({ ...b, texts: [...b.texts] }));

  for (let i = 1; i < out.length - 1; i++) {
    if (blockDuration(out[i]) >= MIN_DURATION_SEC) continue;

    const prev = out[i - 1];
    const cur = out[i];
    const next = out[i + 1];

    const mergePrev = brandsMatch(prev, cur);
    const mergeNext = brandsMatch(cur, next);

    if (mergePrev && (!mergeNext || blockDuration(prev) <= blockDuration(next))) {
      mergeBlock(prev, cur);
      out.splice(i, 1);
      i--;
    } else if (mergeNext) {
      mergeBlock(cur, next);
      out.splice(i + 1, 1);
    } else if (blockDuration(prev) <= blockDuration(next)) {
      mergeBlock(prev, cur);
      out.splice(i, 1);
      i--;
    } else {
      mergeBlock(cur, next);
      out.splice(i + 1, 1);
    }
  }

  return out;
}

function coalesceToTarget(blocks: RawBlock[]): RawBlock[] {
  if (blocks.length <= 1) return blocks;

  const out = blocks.map((b) => ({ ...b, texts: [...b.texts] }));
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < out.length - 1; i++) {
      const cur = out[i];
      const next = out[i + 1];
      const curDur = blockDuration(cur);
      const nextDur = blockDuration(next);
      const combined = cur.end - cur.start + nextDur;

      const shouldMerge =
        combined <= TARGET_MAX_SEC &&
        brandsMatch(cur, next) &&
        (curDur < TARGET_MIN_SEC || nextDur < TARGET_MIN_SEC);

      if (shouldMerge) {
        mergeBlock(cur, next);
        out.splice(i + 1, 1);
        changed = true;
        break;
      }
    }
  }

  return out;
}

function largestInternalGap(
  block: RawBlock,
  segments: TranscriptSegment[],
): number | null {
  const inner = segments.filter((s) => s.start >= block.start - 0.05 && s.end <= block.end + 0.05);
  if (inner.length < 2) return null;

  let bestGap = 0;
  let bestAt: number | null = null;

  for (let i = 0; i < inner.length - 1; i++) {
    const gap = inner[i + 1].start - inner[i].end;
    if (gap > bestGap) {
      bestGap = gap;
      bestAt = inner[i + 1].start;
    }
  }

  return bestAt;
}

function splitBlockAt(
  block: RawBlock,
  splitAt: number,
  segments: TranscriptSegment[],
): [RawBlock, RawBlock] {
  const left: RawBlock = { start: block.start, end: splitAt, texts: [], key: block.key };
  const right: RawBlock = { start: splitAt, end: block.end, texts: [], key: block.key };
  const inner = segments.filter(
    (s) => s.start >= block.start - 0.05 && s.end <= block.end + 0.05,
  );

  for (const seg of inner) {
    const text = normalizeText(seg.text);
    if (!text) continue;
    if (seg.start < splitAt) {
      left.texts.push(text);
      left.end = Math.max(left.end, seg.end);
    } else {
      right.texts.push(text);
      right.start = Math.min(right.start, seg.start);
      right.end = Math.max(right.end, seg.end);
    }
  }

  return [left, right];
}

function splitOversized(blocks: RawBlock[], segments: TranscriptSegment[]): RawBlock[] {
  const out: RawBlock[] = [];

  for (const block of blocks) {
    if (blockDuration(block) <= TARGET_MAX_SEC) {
      out.push(block);
      continue;
    }

    let splitAt = largestInternalGap(block, segments);
    if (
      splitAt == null ||
      splitAt <= block.start + MIN_DURATION_SEC ||
      splitAt >= block.end - MIN_DURATION_SEC
    ) {
      splitAt = block.start + blockDuration(block) / 2;
    }

    const [left, right] = splitBlockAt(block, splitAt, segments);
    if (blockDuration(left) >= MIN_DURATION_SEC) out.push(left);
    else if (out.length) mergeBlock(out[out.length - 1], left);
    else out.push(left);

    if (blockDuration(right) >= MIN_DURATION_SEC) out.push(right);
    else if (out.length) mergeBlock(out[out.length - 1], right);
    else out.push(right);
  }

  return mergeAdjacentSameBrand(out);
}

function splitOversizedUntilDone(blocks: RawBlock[], segments: TranscriptSegment[]): RawBlock[] {
  let out = blocks;
  for (let pass = 0; pass < 40; pass++) {
    const next = splitOversized(out, segments);
    const merged = mergeAdjacentSameBrand(next);
    const maxDur = Math.max(...merged.map(blockDuration));
    out = merged;
    if (maxDur <= TARGET_MAX_SEC) break;
  }
  return out;
}

export function buildCommercialCompilationChapters(
  segments: TranscriptSegment[],
): ContentChapter[] {
  if (segments.length === 0) {
    return [{ start: 0, end: 0, title: "Commercial - Full reel", kind: "commercial" }];
  }

  const videoEnd = segments[segments.length - 1].end;
  const firstStart = segments[0].start;

  let blocks = groupSegments(segments);
  blocks = mergeAdjacentSameBrand(blocks);
  blocks = enforceMinDuration(blocks);
  blocks = coalesceToTarget(blocks);
  blocks = splitOversizedUntilDone(blocks, segments);
  blocks = enforceMinDuration(blocks);

  const chapters: ContentChapter[] = blocks.map((b) => ({
    start: b.start,
    end: b.end,
    title: titleForBlock(b),
    kind: "commercial" as const,
  }));

  if (chapters.length === 0) {
    return [{ start: firstStart, end: videoEnd, title: "Commercial - Full reel", kind: "commercial" }];
  }

  chapters[0].start = firstStart;
  chapters[chapters.length - 1].end = videoEnd;
  for (let i = 0; i < chapters.length - 1; i++) {
    chapters[i].end = chapters[i + 1].start;
  }

  return chapters;
}
