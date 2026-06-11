import {
  DEFAULT_ARTIFACT_ARCHETYPE,
  parseArtifactArchetypeChoice,
  type ArtifactArchetypeChoice,
} from "@/lib/creative/artifact-archetypes";

/** Phase 2 — Era (visual language) and Creative Direction (composition) are independent. */

export const CREATIVE_DIRECTION_IDS = [
  "festival-pass",
  "backstage-credential",
  "concert-poster",
  "collector-card",
  "record-sleeve",
  "tv-promotion",
  "radio-promotion",
  "magazine-cover",
  "tour-program",
  "ticket-stub",
] as const;

export type CreativeDirectionId = (typeof CREATIVE_DIRECTION_IDS)[number];

export const DEFAULT_CREATIVE_DIRECTION: CreativeDirectionId = "collector-card";

export type CreativeDirectionSettings = {
  creativeDirection: CreativeDirectionId;
  avoidEraTropes: boolean;
  maximizeVariation: boolean;
  artifactArchetype: ArtifactArchetypeChoice;
};

export const DEFAULT_CREATIVE_DIRECTION_SETTINGS: CreativeDirectionSettings = {
  creativeDirection: DEFAULT_CREATIVE_DIRECTION,
  avoidEraTropes: true,
  maximizeVariation: true,
  artifactArchetype: DEFAULT_ARTIFACT_ARCHETYPE,
};

export type CreativeDirectionDef = {
  id: CreativeDirectionId;
  label: string;
  composition: string;
  subjectMatter: string;
  typographyArrangement: string;
  references: string;
};

export const CREATIVE_DIRECTIONS: Record<CreativeDirectionId, CreativeDirectionDef> = {
  "festival-pass": {
    id: "festival-pass",
    label: "Festival Pass",
    composition:
      "Admission credential layout — ornamental gate framing, event title as admission headline, venue and date as typographic metadata woven into border bands.",
    subjectMatter:
      "Gate graphics, admission typography, festival branding, perforated stub energy — NOT buildings, facades, or crowd scenes.",
    typographyArrangement:
      "Bold admission headline, secondary venue/date band, years as accent strip along edge or banner.",
    references: "Fillmore hand-stamps, festival gate passes, venue admission plates, summer concert credentials.",
  },
  "backstage-credential": {
    id: "backstage-credential",
    label: "Backstage Credential",
    composition:
      "Production laminate structure — access hierarchy through typography weight and border seals, not security color blocks. Compact metadata rails.",
    subjectMatter:
      "Stage-door plates, production seals, tour backline iconography — no lanyard holes, no employee photo slots.",
    typographyArrangement:
      "Event name primary, venue and date in production footer, pass type as small seal marking.",
    references: "Tour laminate plates, stage-door guest lists, production company credentials, road-case stickers.",
  },
  "concert-poster": {
    id: "concert-poster",
    label: "Concert Poster",
    composition:
      "Poster-first layout — hero illustration or typographic monument dominates, event text as display lettering integrated into poster hierarchy.",
    subjectMatter:
      "Performance iconography, bill-headline composition, hand-screened print texture — illustration serves the poster concept, not era cliché filler. No building or marquee illustration.",
    typographyArrangement:
      "Oversized event title as poster headline, venue and date as secondary typographic lines, years as billing accent.",
    references: "Concert hall bills, hand-screened show prints, promoter handbills, letterpress poster stock.",
  },
  "collector-card": {
    id: "collector-card",
    label: "Collector Card",
    composition:
      "Trading-card / memorabilia card structure — framed portrait field, ornamental border, collectible edition energy. Balanced figure-ground.",
    subjectMatter:
      "Memorabilia portrait framing, edition crest, collector seal graphics — subject chosen to fit event, not era default motifs.",
    typographyArrangement:
      "Event name on card nameplate, venue and date on collector caption line, years as edition accent.",
    references: "Music trading cards, commemorative edition cards, fan-club collectibles, souvenir card stock.",
  },
  "record-sleeve": {
    id: "record-sleeve",
    label: "Record Sleeve",
    composition:
      "Album jacket layout — square-aware portrait crop, label typography, spine-energy framing on portrait card.",
    subjectMatter:
      "Sleeve photography treatment, label logos, track-listing visual rhythm adapted to pass scale — no literal vinyl unless era-appropriate accent.",
    typographyArrangement:
      "Artist/event name as album title, venue and date as liner-note caption, years as catalog accent.",
    references: "LP gatefolds, 45 sleeves, label promo jackets, record-store display cards.",
  },
  "tv-promotion": {
    id: "tv-promotion",
    label: "TV Promotion",
    composition:
      "Broadcast promo card — title-safe framing, show-logo energy, network bumper composition scaled to portrait card.",
    subjectMatter:
      "Television graphic design, show title treatments, broadcast schedule accents — NOT generic MTV logos or neon grids unless era mandate requires.",
    typographyArrangement:
      "Show/event title as broadcast display type, venue and date as lower-third caption, years as episode or season accent.",
    references: "TV Guide promos, network fall schedules, variety show title cards, broadcast affiliate bumpers.",
  },
  "radio-promotion": {
    id: "radio-promotion",
    label: "Radio Promotion",
    composition:
      "Station promo card — dial frequency energy, call-letter prominence, on-air giveaway composition.",
    subjectMatter:
      "Radio station branding, transmitter iconography, DJ booth graphic language — no giant headphones or cassette clichés.",
    typographyArrangement:
      "Event name as promo headline, station/venue as call-letter line, date as broadcast schedule accent.",
    references: "Station bumper stickers, radio contest cards, call-letter logos, AM/FM promo handouts.",
  },
  "magazine-cover": {
    id: "magazine-cover",
    label: "Magazine Cover",
    composition:
      "Editorial cover layout — masthead zone, coverline hierarchy, feature portrait or graphic centerpiece.",
    subjectMatter:
      "Magazine coverlines, editorial photography framing, newsstand cover composition — subject supports cover story energy.",
    typographyArrangement:
      "Masthead or event name top, coverlines for venue/date/years, pass type as issue marking.",
    references: "Rolling Stone covers, teen magazine covers, music press features, newsstand display cards.",
  },
  "tour-program": {
    id: "tour-program",
    label: "Tour Program",
    composition:
      "Tour book / program cover layout — itinerary elegance, tour crest, premium souvenir program framing.",
    subjectMatter:
      "Tour map accents, program cover illustration, routing typography — refined keepsake, not road-worn cliché. No venue architecture.",
    typographyArrangement:
      "Tour/event title as program cover, venue and date as itinerary line, years as tour season accent.",
    references: "Arena tour programs, concert souvenir books, tour date sheets, VIP program covers.",
  },
  "ticket-stub": {
    id: "ticket-stub",
    label: "Ticket Stub",
    composition:
      "Admission stub layout — perforated tear edge, seat or admission block, stub tear as compositional anchor.",
    subjectMatter:
      "Ticket stock typography, admission numbering area (back only for real serial), perforation and stub graphics — NOT crowd scenes or building illustration.",
    typographyArrangement:
      "Event as admission title, venue and date in stub metadata band, years as price-tier or series accent.",
    references: "Concert ticket stubs, venue admission tickets, box-office keepsakes, mailed ticket stock.",
  },
};

/** Sub-variations within a direction — rotated by composition seed. */
const DIRECTION_VARIATIONS: Record<CreativeDirectionId, string[]> = {
  "festival-pass": [
    "Asymmetric gate-frame with corner ornaments",
    "Centered admission medallion with side bands",
    "Diagonal entry banner with inset metadata block",
    "Vertical caption column with horizontal event band",
  ],
  "backstage-credential": [
    "Corner seal layout with centered production plate",
    "Horizontal laminate bands with inset metadata",
    "Diagonal access ribbon with corner stamps",
    "Symmetric production frame with footer rail",
  ],
  "concert-poster": [
    "Typographic monument — illustration as accent only",
    "Hero illustration top two-thirds, text footer",
    "Split diagonal poster with dual text anchors",
    "Circular spotlight vignette with arched title",
  ],
  "collector-card": [
    "Centered portrait field with ornate card border",
    "Offset portrait with nameplate banner",
    "Crest medallion top, caption band bottom",
    "Full-bleed illustration with inset nameplate",
  ],
  "record-sleeve": [
    "Top-half photo field, bottom label typography",
    "Centered title with sleeve spine accent strip",
    "Gatefold-inspired split with caption rail",
    "Label-logo header with feature illustration below",
  ],
  "tv-promotion": [
    "Title-safe centered promo with corner network marks",
    "Lower-third heavy broadcast layout",
    "Split-screen promo energy without literal TV frame",
    "Schedule-card layout with show title dominant",
  ],
  "radio-promotion": [
    "Call-letter dominant with event caption strip",
    "Frequency dial motif as background texture only",
    "Contest-card layout with bold headline",
    "Station bumper stripe with inset event block",
  ],
  "magazine-cover": [
    "Classic masthead top with coverline stack",
    "Feature portrait center with side coverlines",
    "Bold coverline dominant, small masthead",
    "Split cover with portrait left, lines right",
  ],
  "tour-program": [
    "Tour crest centered with itinerary footer",
    "Program cover illustration with title overlay",
    "Elegant border frame with tour season band",
    "Tour crest energy with refined itinerary typography",
  ],
  "ticket-stub": [
    "Classic horizontal stub with right tear perforation",
    "Vertical stub with bottom admission band",
    "Centered admission block with corner stamp marks",
    "Layered stub collage with primary tear edge",
  ],
};

export function creativeDirectionById(id: string): CreativeDirectionDef {
  const key = CREATIVE_DIRECTION_IDS.includes(id as CreativeDirectionId)
    ? (id as CreativeDirectionId)
    : DEFAULT_CREATIVE_DIRECTION;
  return CREATIVE_DIRECTIONS[key];
}

export function pickDirectionVariation(directionId: CreativeDirectionId, seed: number): string {
  const variations = DIRECTION_VARIATIONS[directionId];
  return variations[Math.abs(seed) % variations.length]!;
}

export function parseCreativeDirectionSettings(
  body: Record<string, unknown>,
): CreativeDirectionSettings {
  const raw = typeof body.creativeDirection === "string" ? body.creativeDirection : DEFAULT_CREATIVE_DIRECTION;
  const creativeDirection = CREATIVE_DIRECTION_IDS.includes(raw as CreativeDirectionId)
    ? (raw as CreativeDirectionId)
    : DEFAULT_CREATIVE_DIRECTION;
  return {
    creativeDirection,
    avoidEraTropes: body.avoidEraTropes !== false,
    maximizeVariation: body.maximizeVariation !== false,
    artifactArchetype: parseArtifactArchetypeChoice(body.artifactArchetype),
  };
}

const BACK_LAYOUT_HINTS = [
  "collector card back; dominant QR safe area in lower half · retroverse.live below QR · serial at bottom edge",
  "keepsake reverse; large functional QR square (~70% card width) · shrink seal before QR",
  "laminate back; artwork upper half · QR dominates lower half · thin ornament outside safe area only",
  "binder card reverse; QR primary · URL band under QR · serial footer flush bottom",
] as const;

/** Single composition/layout source — no duplication elsewhere. */
export function creativeDirectionPromptBlock(
  settings: CreativeDirectionSettings,
  compositionSeed: number,
  side: "front" | "back" = "front",
  frontSummary?: string,
): string {
  const dir = creativeDirectionById(settings.creativeDirection);
  const variation = pickDirectionVariation(dir.id, compositionSeed);
  const backHint = BACK_LAYOUT_HINTS[Math.abs(compositionSeed + 17) % BACK_LAYOUT_HINTS.length]!;

  const lines = [
    `${dir.label}: ${dir.composition}`,
    `Subject: ${dir.subjectMatter}`,
    `Typography: ${dir.typographyArrangement}`,
    `Variation: ${variation}`,
  ];

  if (side === "front") {
    lines.push(`Layout: Full-bleed front, 100% artwork, no QR/serial zones, no generated numbers`);
  } else {
    lines.push(
      `Layout: ${backHint} · large clear verification square lower half · retroverse.live below · serial bottom · ornament yields to QR`,
    );
    if (frontSummary) lines.push(`Mirror front: ${frontSummary}`);
  }

  if (settings.maximizeVariation) {
    lines.push(`Vary layout skeleton and focal subject each generation`);
  }

  return lines.join("\n");
}

export function avoidEraTropesPromptBlock(enabled: boolean): string {
  if (!enabled) return "";
  return [
    `AVOID COMMON ERA TROPES (ENABLED):`,
    `Do NOT default to the most obvious visual clichés associated with this era.`,
    `Seek secondary and lesser-used design references authentic to the period.`,
    ``,
    `Avoid unless genuinely required by the Creative Direction:`,
    `- Giant sun faces and sunburst hippie clichés`,
    `- Peace signs and generic flower-power stereotypes`,
    `- Generic festival crowd scenes and mountain panoramas`,
    `- Neon grids, lightning bolts, and synthwave tropes`,
    `- Cassette tapes, giant headphones, and CD pile clichés`,
    `- Graffiti tags and generic street-art filler`,
    `- Generic MTV logos and music-television stock imagery`,
    ``,
    `Prefer unique compositions and authentic lesser-known design references from the era.`,
  ].join("\n");
}

export function maximizeVariationPromptBlock(enabled: boolean): string {
  if (!enabled) return "";
  return [
    `MAXIMIZE VARIATION (ENABLED):`,
    `If generating multiple passes in the same era and direction, avoid reusing:`,
    `- Layout skeleton and framing structure`,
    `- Central subject choice and illustration focal point`,
    `- Typography arrangement and visual hierarchy`,
    `- Border treatment and ornamental repetition`,
    ``,
    `Each generation must feel like a distinct design artifact, not a recolored template.`,
  ].join("\n");
}
