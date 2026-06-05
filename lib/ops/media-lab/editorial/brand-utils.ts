const BRAND_LEXICON: { match: RegExp; name: string }[] = [
  { match: /\bcover\s*girl|covergirl\b/i, name: "Covergirl" },
  { match: /\braintree|rayntree\b/i, name: "Raintree" },
  { match: /\britz\b/i, name: "Ritz" },
  { match: /\bmichelin\b/i, name: "Michelin" },
  { match: /\byamaha\b/i, name: "Yamaha" },
  { match: /\bmiller\b/i, name: "Miller" },
  { match: /\bchevrolet|chevy\b/i, name: "Chevrolet" },
  { match: /\bford\b/i, name: "Ford" },
  { match: /\bcoca[\s-]?cola\b/i, name: "Coca-Cola" },
  { match: /\bpepsi\b/i, name: "Pepsi" },
  { match: /\bkellogg'?s?\b/i, name: "Kellogg's" },
  { match: /\bcolgate\b/i, name: "Colgate" },
  { match: /\bgillette\b/i, name: "Gillette" },
  { match: /\bge\b/i, name: "GE" },
  { match: /\bat\s*&\s*t\b/i, name: "AT&T" },
];

export function extractBrandFromText(text: string): string | null {
  for (const { match, name } of BRAND_LEXICON) {
    if (match.test(text)) return name;
  }
  return null;
}

export function extractBrandFromTitle(title: string): string | null {
  const fromPrefix = title.replace(/^Commercial\s*-\s*/i, "").trim();
  const brand = extractBrandFromText(fromPrefix);
  if (brand) return brand;
  const first = fromPrefix.split(/\s+/)[0];
  return first && first.length >= 4 ? first : null;
}

export function brandsMatchTitle(a: string, b: string): boolean {
  const ba = extractBrandFromTitle(a);
  const bb = extractBrandFromTitle(b);
  if (ba && bb) return ba.toLowerCase() === bb.toLowerCase();
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la.includes(lb) || lb.includes(la)) return true;
  return false;
}

export function suggestMergedTitle(a: string, b: string): string {
  const brand = extractBrandFromTitle(a) ?? extractBrandFromTitle(b);
  if (brand) return `Commercial - ${brand}`;
  const base = a.replace(/^Commercial\s*-\s*/i, "").split(/\s+/)[0] ?? "Spot";
  return `Commercial - ${base}`;
}
