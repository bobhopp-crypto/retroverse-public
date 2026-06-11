/** Blocks internal/debug strings from appearing in generated artwork. */
export const MEASUREMENT_LEAK_FORBIDDEN_PATTERNS = [
  /qr\s*safe\s*area/i,
  /\d+\.\d+\s*["″]?\s*[×x]\s*\d+\.\d+/i,
  /\d+\s*×\s*\d+\s*px/i,
  /reserved\s*zone/i,
] as const;

export const NO_MEASUREMENT_ON_ARTWORK_PROMPT = [
  `NO MEASUREMENT OR LAYOUT LABELS ON ARTWORK:`,
  `Never print inch dimensions, pixel counts, zone names, or editor guides on the pass.`,
  `Forbidden on artwork: "QR Safe Area", "1.65 x 1.65", "751px", "reserved zone", or any compositing metadata.`,
  `Safe-area guides exist only in the editor — not in exported or generated artwork.`,
].join("\n");

export const NO_FAKE_NETWORK_BRANDS_PROMPT = [
  `NO INVENTED BROADCAST BRANDS:`,
  `Do not invent or illustrate fake television networks, channel logos, or cable marks.`,
  `Forbidden: RTV, RVTV, fake MTV/VH1 logo parodies, invented network bugs, or generic "music TV" channel branding.`,
  `Express era through palette, typography, framing, and print ephemera — not invented broadcast identities.`,
].join("\n");

export const DEBUG_LEAK_FORBIDDEN_PATTERNS = [
  /rvbr:/i,
  /\bRVER\d{6}\b/i,
  /\bset-[a-z0-9]+\b/i,
  /\bprompt-[a-z0-9-]+\b/i,
  /\basset-[a-z0-9-]+\b/i,
  /\bmusic-television-credential\b/i,
  /\bpsychedelic-festival\b/i,
  /\bconcert-backstage-laminate\b/i,
  /\bvisualWorldId\b/i,
  /\bproject\.json\b/i,
] as const;

export const CREDENTIAL_INVENTION_FORBIDDEN = [
  "ALL ACCESS",
  "NO ESCORT",
  "GUEST",
  "BACKSTAGE",
  "CREW",
  "STAFF",
  "LAMINATE",
  "SECURITY",
  "ESCORT",
  "RESTRICTED",
  "AUTHORIZED",
  "PERSONNEL",
  "PRODUCTION",
  "ROAD CREW",
  "STAGE DOOR",
] as const;

export const NO_INVENTED_TEXT_PROMPT = [
  `NO INVENTED TEXT — ABSOLUTE RULE:`,
  `Retroverse supplies every word that may appear on this pass. The model must NOT invent titles, slogans, credentials, pass types, legal text, venue names, dates, years, metadata, or taglines.`,
  `If a supplied field is empty, render NOTHING for that field — not a placeholder word, not lorem ipsum, not a generic label.`,
  `All typography areas not mapped to supplied fields must be decorative shapes, lines, ornaments, symbols, patterns, or blank areas — never readable words.`,
  `Forbidden invented credential words: ${CREDENTIAL_INVENTION_FORBIDDEN.join(", ")}.`,
].join("\n");

export const DEBUG_LEAK_PREVENTION_PROMPT = [
  `DEBUG / INTERNAL DATA — NEVER RENDER ON ARTWORK:`,
  `Do NOT print internal identifiers, database keys, slugs, era codes, or system metadata on the pass.`,
  `Forbidden on artwork: rvbr:, RVER######, project ids, prompt ids, asset ids, visual world ids, JSON paths, theme codes, year-range slugs like 1982-1985, or any string that looks like software configuration.`,
  `These may exist in production logs only — never on the exported pass.`,
].join("\n");

export const COMPOSITION_LABEL_DISCLAIMER = [
  `COMPOSITION LABELS ARE LAYOUT NAMES ONLY:`,
  `Any concept label or layout name in this brief (e.g. broadcast credential, laminate layout) describes composition — NOT text to print on the pass.`,
  `Only strings from TEXT GOVERNANCE may appear as readable typography.`,
].join("\n");

export function containsDebugLeak(text: string): string | null {
  for (const pattern of DEBUG_LEAK_FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) return text.match(pattern)?.[0] ?? pattern.source;
  }
  return null;
}

export function containsForbiddenCredentialText(text: string): string | null {
  const upper = text.toUpperCase();
  for (const phrase of CREDENTIAL_INVENTION_FORBIDDEN) {
    if (upper.includes(phrase)) return phrase;
  }
  return null;
}
