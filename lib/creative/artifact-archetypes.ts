/** Retroverse artifact archetypes — distinct collectible object types with physical production DNA. */

export const ARTIFACT_ARCHETYPE_IDS = [
  "festival-ticket",
  "backstage-pass",
  "press-credential",
  "record-label-promo",
  "fan-club-card",
  "album-release-invite",
  "radio-vip-pass",
  "concert-credential",
  "tour-laminate",
  "collector-pass",
] as const;

export type ArtifactArchetypeId = (typeof ARTIFACT_ARCHETYPE_IDS)[number];

export type ArtifactArchetypeChoice = ArtifactArchetypeId | "random";

export const DEFAULT_ARTIFACT_ARCHETYPE: ArtifactArchetypeChoice = "random";

export type ArtifactArchetypeDef = {
  id: ArtifactArchetypeId;
  label: string;
  objectType: string;
  layoutStructure: string;
  compositionAnchors: string;
  avoidGenericLayout: string;
  printingMethod: string;
  paperStock: string;
  shape: string;
  perforations: string;
  embossing: string;
  seals: string;
  collectorMarks: string;
};

export const ARTIFACT_ARCHETYPES: Record<ArtifactArchetypeId, ArtifactArchetypeDef> = {
  "festival-ticket": {
    id: "festival-ticket",
    label: "Festival Ticket",
    objectType: "Admission ticket stub — perforated tear, gate numbering band, admission stock.",
    layoutStructure:
      "Horizontal ticket fragment or vertical stub — admission block dominant, event as gate headline, NOT a centered poster stack.",
    compositionAnchors: "Perforation edge, admission zone, stub tear, gate stamp plate.",
    avoidGenericLayout: "No BIG TITLE over BIG ART over DATE over YEARS poster stack.",
    printingMethod: "Two-color letterpress on manila admission stock with knocked-out gate numbers.",
    paperStock: "Fibrous manila ticket stock with visible tooth and slight edge fray.",
    shape: "Horizontal stub fragment or vertical tear-off with one ragged perforated edge.",
    perforations: "Micro-perforation tear line — dashed die-cut, not decorative border.",
    embossing: "Blind-embossed admission block with debossed gate stamp impression.",
    seals: "Rubber gate-stamp seal overlapping admission zone — ink bleed at edges.",
    collectorMarks: "Box-office chop mark in corner; price-tier ink stamp suggestion.",
  },
  "backstage-pass": {
    id: "backstage-pass",
    label: "Backstage Pass",
    objectType: "Production backstage laminate — stage-door plate, crew access seal, tour backline credential.",
    layoutStructure:
      "Compact production plate — seal corners, access hierarchy through weight not color blocks, metadata in footer rail.",
    compositionAnchors: "Stage-door seal, production company plate, road-case sticker energy.",
    avoidGenericLayout: "No festival poster sunburst. No generic VIP header bar.",
    printingMethod: "Screen print on laminate substrate with spot varnish on access seals.",
    paperStock: "Heavy laminate backing with matte face and slight corner curl.",
    shape: "Portrait laminate plate with rounded corners and grommet-hole suggestion (no lanyard).",
    perforations: "None — solid laminate stock.",
    embossing: "Raised production-company plate emboss at top edge.",
    seals: "Stage-door rubber stamp and tour crest seal overlapping corner.",
    collectorMarks: "Road-crew handling wear — subtle scuff at lower corner.",
  },
  "press-credential": {
    id: "press-credential",
    label: "Press Credential",
    objectType: "Music press credential — journalist access card, publication masthead miniaturized, editorial stamp.",
    layoutStructure:
      "Editorial credential layout — masthead strip, press corps marking, compact metadata columns, NOT concert poster hierarchy.",
    compositionAnchors: "Press corps stamp, publication header, access corridor marking.",
    avoidGenericLayout: "No oversized hero illustration with stacked event fields beneath.",
    printingMethod: "Offset litho on smooth coated cardstock with halftone editorial texture.",
    paperStock: "Smooth ivory press card with clean cut edges.",
    shape: "Portrait press card — slightly narrower than standard pass proportions.",
    perforations: "None.",
    embossing: "Blind-embossed press corps insignia medallion.",
    seals: "Editorial approval stamp and press-access rubber mark.",
    collectorMarks: "Publication chop in corner; press-room date stamp energy.",
  },
  "record-label-promo": {
    id: "record-label-promo",
    label: "Record Label Promo Card",
    objectType: "Label promo postcard — catalog number band, A&R stamp, release announcement stock.",
    layoutStructure:
      "Label postcard — logo header, catalog strip, release caption, illustration as label art accent not hero poster.",
    compositionAnchors: "Label logo plate, catalog number, promo postcard margins.",
    avoidGenericLayout: "No concert bill poster layout. No giant centered event title monument.",
    printingMethod: "Letterpress label logo with offset halftone illustration accent.",
    paperStock: "Cream laid postcard stock with deckled or clean-cut margin.",
    shape: "Postcard proportions — slight landscape energy within portrait crop.",
    perforations: "Optional mailing-perforation hint along one edge.",
    embossing: "Foil-stamped label logo with debossed catalog number band.",
    seals: "A&R approval stamp and promo-house rubber seal.",
    collectorMarks: "Catalog number strip; promo-not-for-sale marking energy.",
  },
  "fan-club-card": {
    id: "fan-club-card",
    label: "Fan Club Membership Card",
    objectType: "Fan club membership card — member number zone suggestion, club crest, collectible wallet card.",
    layoutStructure:
      "Wallet card proportions — crest top-left or center medallion, member ribbon, club motto band, intimate not billboard.",
    compositionAnchors: "Fan club crest, membership ribbon, wallet-card border.",
    avoidGenericLayout: "No full-bleed poster with event title dominating 60% of canvas.",
    printingMethod: "Hot-foil crest on linen-finish wallet stock.",
    paperStock: "Thin wallet card stock with linen texture and slight lamination.",
    shape: "Credit-card proportions scaled to portrait pass — compact and intimate.",
    perforations: "None.",
    embossing: "Raised club crest medallion with membership ribbon deboss.",
    seals: "Official fan-club wax-seal graphic and membership stamp.",
    collectorMarks: "Member-since band; club motto in ornamental ribbon.",
  },
  "album-release-invite": {
    id: "album-release-invite",
    label: "Album Release Invitation",
    objectType: "Album release invitation — listening party card, sleeve art fragment, invitation formal stock.",
    layoutStructure:
      "Invitation card — formal release announcement, sleeve fragment or label art as accent, RSVP-style caption bands.",
    compositionAnchors: "Invitation border, release date medallion, sleeve art inset.",
    avoidGenericLayout: "No generic event poster with years strip at bottom.",
    printingMethod: "Letterpress invitation border with spot-color sleeve inset.",
    paperStock: "Heavy ivory invitation stock with deckled edge suggestion.",
    shape: "Formal invitation card — ornamental border frame dominant.",
    perforations: "None.",
    embossing: "Blind-embossed invitation border with raised date medallion.",
    seals: "Label house seal and listening-party chop mark.",
    collectorMarks: "RSVP-style caption band; release-date crest.",
  },
  "radio-vip-pass": {
    id: "radio-vip-pass",
    label: "Radio Station VIP Pass",
    objectType: "Radio station VIP pass — call letters dominant, station bumper stripe, on-air giveaway credential.",
    layoutStructure:
      "Station promo card — call letters as primary graphic element, frequency band, event as secondary giveaway line.",
    compositionAnchors: "Call-letter logo, dial frequency strip, station bumper frame.",
    avoidGenericLayout: "No generic laminate with horizontal metadata rows.",
    printingMethod: "Screen print with bold station colors and bumper-stripe overprint.",
    paperStock: "Glossy promo cardstock with station bumper sticker energy.",
    shape: "Portrait promo card with horizontal bumper stripe across upper third.",
    perforations: "Contest-entry perforation tab suggestion along bottom edge.",
    embossing: "Raised call-letter logo with frequency dial deboss.",
    seals: "On-air giveaway rubber stamp and station manager chop.",
    collectorMarks: "Dial frequency band; contest-rules fine-print energy in footer.",
  },
  "concert-credential": {
    id: "concert-credential",
    label: "Concert Credential",
    objectType: "Concert admission credential — box office stamp, performance night plate, hall keepsake stock.",
    layoutStructure:
      "Admission plate layout — performance night caption, box office seal, admission typography — NOT poster stack.",
    compositionAnchors: "Box office stamp, performance night plate, admission seal band.",
    avoidGenericLayout: "No BIG TITLE / BIG ART / DATE / YEARS vertical stack. No building illustration.",
    printingMethod: "Letterpress admission plate on cream laid stock with box-office ink stamp.",
    paperStock: "Cream laid cardstock with admission-window handling patina.",
    shape: "Portrait admission plate with ornamental top band.",
    perforations: "Admission tear stub along bottom edge.",
    embossing: "Debossed performance-night medallion.",
    seals: "Box-office rubber stamp overlapping admission zone.",
    collectorMarks: "Price-tier ink mark; performance-night keepsake crest.",
  },
  "tour-laminate": {
    id: "tour-laminate",
    label: "Tour Laminate",
    objectType: "Tour laminate — road crew credential, tour crest, city routing accent, arena circuit plate.",
    layoutStructure:
      "Tour laminate plate — tour crest centered, city routing accent strip, crew credential footer, road-worn premium stock.",
    compositionAnchors: "Tour crest, routing strip, laminate corner seals.",
    avoidGenericLayout: "No single hero illustration with four text bands beneath.",
    printingMethod: "Screen print on tour laminate with spot UV on crest.",
    paperStock: "Heavy laminate with road-worn scuffing and corner dog-ear.",
    shape: "Portrait laminate with rounded corners and corner grommet marks.",
    perforations: "None.",
    embossing: "Raised tour crest with routing-strip deboss.",
    seals: "Tour manager stamp and city routing verification chop.",
    collectorMarks: "City routing accent strip; crew-access footer seal.",
  },
  "collector-pass": {
    id: "collector-pass",
    label: "Collector Pass",
    objectType: "Collector edition pass — numbered edition energy, memorabilia plate, premium keepsake stock.",
    layoutStructure:
      "Collectible edition card — ornate border, edition crest, event woven into frame not stacked fields, intimate scale.",
    compositionAnchors: "Edition crest, collector seal, memorabilia plate frame.",
    avoidGenericLayout: "No template poster with identical title-art-date-years hierarchy.",
    printingMethod: "Hot-foil edition crest with letterpress border on premium stock.",
    paperStock: "Heavy linen collector card with gilt edge suggestion.",
    shape: "Portrait collector card with ornate die-cut border frame.",
    perforations: "None.",
    embossing: "Blind-embossed edition border with raised crest medallion.",
    seals: "Collector authenticity seal and edition chop mark.",
    collectorMarks: "Edition crest; memorabilia plate frame; premium keepsake energy.",
  },
};

export function artifactArchetypeById(id: string): ArtifactArchetypeDef {
  if (ARTIFACT_ARCHETYPE_IDS.includes(id as ArtifactArchetypeId)) {
    return ARTIFACT_ARCHETYPES[id as ArtifactArchetypeId];
  }
  return ARTIFACT_ARCHETYPES["collector-pass"];
}

export function resolveArtifactArchetype(
  choice: ArtifactArchetypeChoice | undefined,
  seed: number,
): ArtifactArchetypeId {
  if (choice && choice !== "random" && ARTIFACT_ARCHETYPE_IDS.includes(choice)) {
    return choice;
  }
  return ARTIFACT_ARCHETYPE_IDS[Math.abs(seed + 31) % ARTIFACT_ARCHETYPE_IDS.length]!;
}

export function artifactArchetypePromptBlock(archetype: ArtifactArchetypeDef, seed: number): string {
  return [
    `ARTIFACT ARCHETYPE — ${archetype.label.toUpperCase()} (OBJECT TYPE):`,
    `This pass is a ${archetype.objectType}`,
    `Archetype seed ${seed} — this object type must materially change layout, shape, and production method.`,
    ``,
    `Layout structure: ${archetype.layoutStructure}`,
    `Composition anchors: ${archetype.compositionAnchors}`,
    ``,
    `PHYSICAL PRODUCTION (render these material cues):`,
    `- Printing: ${archetype.printingMethod}`,
    `- Paper stock: ${archetype.paperStock}`,
    `- Shape: ${archetype.shape}`,
    `- Perforations: ${archetype.perforations}`,
    `- Embossing: ${archetype.embossing}`,
    `- Seals: ${archetype.seals}`,
    `- Collector marks: ${archetype.collectorMarks}`,
    ``,
    `FORBIDDEN GENERIC LAYOUT: ${archetype.avoidGenericLayout}`,
    `Do NOT produce: BIG TITLE → BIG ART → DATE → YEARS stacked poster template.`,
    `Do NOT illustrate buildings, facades, or venue architecture — venue is governed text only.`,
    `This must read as a distinct physical Retroverse collectible — compelling even if venue reads "Venue XYZ".`,
  ].join("\n");
}

export function parseArtifactArchetypeChoice(raw: unknown): ArtifactArchetypeChoice {
  if (typeof raw === "string" && raw === "random") return "random";
  if (typeof raw === "string" && ARTIFACT_ARCHETYPE_IDS.includes(raw as ArtifactArchetypeId)) {
    return raw as ArtifactArchetypeId;
  }
  return DEFAULT_ARTIFACT_ARCHETYPE;
}
