/** Shared brand / entity detection for commercial mode + editorial review. */

export const COMMERCIAL_BRAND_LEXICON: { match: RegExp; name: string }[] = [
  { match: /\bcover\s*girl|covergirl\b/i, name: "Covergirl" },
  { match: /\braintree|rayntree\b/i, name: "Raintree" },
  { match: /\bben[\s-]?gay|bengay\b/i, name: "Ben Gay" },
  { match: /\bjohnny\s+cash\b/i, name: "Johnny Cash" },
  { match: /\britz\b/i, name: "Ritz" },
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

const FILLER = new Set([
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
  "commercial",
  "clean",
  "makeup",
  "moisturizer",
  "it",
  "sunday",
  "fever",
  "spring",
]);

export function normalizeCommercialText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function extractBrandFromText(text: string): string | null {
  for (const { match, name } of COMMERCIAL_BRAND_LEXICON) {
    if (match.test(text)) return name;
  }
  const sponsored = text.match(
    /\b(?:brought\s+to\s+you\s+by|sponsored\s+by)\s+([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+){0,2})/,
  );
  if (sponsored?.[1]) return sponsored[1].trim();
  return null;
}

export function extractBrandFromTitle(title: string): string | null {
  const fromPrefix = title.replace(/^Commercial\s*-\s*/i, "").trim();
  const brand = extractBrandFromText(fromPrefix);
  if (brand) return brand;
  const words = fromPrefix.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const two = `${words[0]} ${words[1]}`;
    const hit = extractBrandFromText(two);
    if (hit) return hit;
  }
  const first = words[0];
  return first && first.length >= 4 ? first : null;
}

export function significantTokens(text: string): string[] {
  return normalizeCommercialText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !FILLER.has(w));
}

export function tokenSet(text: string): Set<string> {
  return new Set(significantTokens(text));
}

export function transcriptSimilarity(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const x of ta) if (tb.has(x)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** True when B looks like a continuation fragment of the same spot as A. */
export function isContinuationFragment(textA: string, textB: string): boolean {
  const tb = significantTokens(textB);
  if (tb.length === 0) return false;
  const ta = new Set(significantTokens(textA));
  const overlap = tb.filter((t) => ta.has(t)).length;
  if (overlap / tb.length >= 0.55) return true;

  const brandA = extractBrandFromText(textA);
  const brandB = extractBrandFromText(textB);
  if (brandA && brandB && brandA === brandB) return true;

  const headA = significantTokens(textA)[0];
  const headB = significantTokens(textB)[0];
  if (headA && headB && headA === headB && headA.length >= 4) return true;

  const combined = `${textA} ${textB}`.toLowerCase();
  const brand = extractBrandFromText(combined);
  if (brand && (extractBrandFromText(textA) === brand || extractBrandFromText(textB) === brand)) {
    return true;
  }

  return false;
}

export function brandsMatchText(a: string, b: string): boolean {
  const ba = extractBrandFromText(a);
  const bb = extractBrandFromText(b);
  if (ba && bb) return ba === bb;
  return isContinuationFragment(a, b);
}

export function brandsMatchTitle(a: string, b: string): boolean {
  const ba = extractBrandFromTitle(a);
  const bb = extractBrandFromTitle(b);
  if (ba && bb) return ba.toLowerCase() === bb.toLowerCase();
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la.includes(lb) || lb.includes(la)) return true;
  return brandsMatchText(a, b);
}

export function commercialTitleForText(text: string): string {
  const brand = extractBrandFromText(text);
  if (brand) return `Commercial - ${brand}`;
  const proper = normalizeCommercialText(text)
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !FILLER.has(w.toLowerCase()))
    .slice(0, 3);
  if (proper.length >= 2) return `Commercial - ${proper.join(" ")}`;
  return "Commercial - Spot";
}

export function suggestMergedTitle(a: string, b: string): string {
  const combined = `${a} ${b}`;
  const brand =
    extractBrandFromTitle(a) ??
    extractBrandFromTitle(b) ??
    extractBrandFromText(combined);
  if (brand) return `Commercial - ${brand}`;
  return commercialTitleForText(combined);
}
