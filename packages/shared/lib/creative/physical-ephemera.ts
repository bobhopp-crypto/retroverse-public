/** Physical production vocabulary — printing, stock, shape, seals, collector marks. */

export const VENUE_TEXT_ONLY_RULE = [
  `VENUE RULE — TEXT ONLY (MANDATORY):`,
  `Venue name is governed typography — a text string woven into the artifact, never a visual subject.`,
  `Do NOT illustrate buildings, facades, marquees, pub exteriors, stadiums, halls, or venue architecture.`,
  `Do NOT invent or depict any establishment — the pass must remain compelling if venue reads "Venue XYZ".`,
  `Venue appears only as exact governed text in typographic bands, stamps, captions, or metadata rails.`,
].join("\n");

const PRINTING_METHODS = [
  "letterpress on heavy stock with debossed impression",
  "offset litho with halftone grain and registration marks",
  "screen print with ink buildup and slight misregistration charm",
  "hot-foil stamp with metallic accent and blind emboss",
  "risograph-style layered inks with visible overprint",
  "letterpress + spot varnish on matte stock",
  "two-color letterpress with knocked-out white type",
  "rubber-stamp overprint on aged cardstock",
] as const;

const PAPER_STOCKS = [
  "cream laid cardstock with visible tooth",
  "manila ticket stock with fibrous edge",
  "heavy ivory cover stock with deckled margin",
  "smooth coated promo card with slight curl",
  "kraft laminate backing with worn corners",
  "textured laid paper with watermark suggestion",
  "thin admission stock with perforated tear edge",
  "premium collector card stock with linen finish",
] as const;

const COLLECTOR_MARKS = [
  "edition crest with blind-embossed border",
  "numbered collector seal (no readable number unless governed)",
  "holographic foil medallion accent",
  "wax-seal impression graphic",
  "rubber-stamp authenticity mark",
  "corner chop mark like a record-store promo",
  "tour laminate corner grommet suggestion",
  "fan-club membership emboss",
] as const;

function pick<T>(items: readonly T[], seed: number, salt: number): T {
  return items[Math.abs(seed + salt) % items.length]!;
}

export function physicalEphemeraPromptBlock(seed: number): string {
  const printing = pick(PRINTING_METHODS, seed, 7);
  const stock = pick(PAPER_STOCKS, seed, 13);
  const mark = pick(COLLECTOR_MARKS, seed, 23);

  return [
    `PHYSICAL EPHEMERA — PRODUCTION REALISM:`,
    `This is a tangible printed object — not digital poster art. Show material evidence.`,
    ``,
    `Printing method: ${printing}`,
    `Paper stock: ${stock}`,
    `Collector mark: ${mark}`,
    ``,
    `Material cues to render:`,
    `- Visible paper tooth, ink absorption, or stock weight`,
    `- Perforations, die-cuts, rounded corners, or stub tear where archetype warrants`,
    `- Embossing, debossing, foil stamp, or rubber-stamp impressions`,
    `- Corner wear, slight crease, or handling patina appropriate to era (subtle)`,
    `- Seals, chops, and verification marks as graphic elements — not security-badge UI`,
    ``,
    `Object must read as a found collectible — discovered in a crate, not generated on a screen.`,
    ``,
    VENUE_TEXT_ONLY_RULE,
  ].join("\n");
}
