/** Retroverse artifact archetypes — distinct collectible object types, not generic poster layouts. */

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
};

export const ARTIFACT_ARCHETYPES: Record<ArtifactArchetypeId, ArtifactArchetypeDef> = {
  "festival-ticket": {
    id: "festival-ticket",
    label: "Festival Ticket",
    objectType: "Admission ticket stub — perforated tear, gate numbering band, venue admission stock.",
    layoutStructure:
      "Horizontal ticket fragment or vertical stub — admission block dominant, event as gate headline, NOT a centered poster stack.",
    compositionAnchors: "Perforation edge, admission zone, stub tear, gate stamp plate.",
    avoidGenericLayout: "No BIG TITLE over BIG ART over DATE over YEARS poster stack.",
  },
  "backstage-pass": {
    id: "backstage-pass",
    label: "Backstage Pass",
    objectType: "Production backstage laminate — stage-door plate, crew access seal, tour backline credential.",
    layoutStructure:
      "Compact production plate — seal corners, access hierarchy through weight not color blocks, metadata in footer rail.",
    compositionAnchors: "Stage-door seal, production company plate, road-case sticker energy.",
    avoidGenericLayout: "No festival poster sunburst. No generic VIP header bar.",
  },
  "press-credential": {
    id: "press-credential",
    label: "Press Credential",
    objectType: "Music press credential — journalist access card, publication masthead miniaturized, editorial stamp.",
    layoutStructure:
      "Editorial credential layout — masthead strip, press corps marking, compact metadata columns, NOT concert poster hierarchy.",
    compositionAnchors: "Press corps stamp, publication header, access corridor marking.",
    avoidGenericLayout: "No oversized hero illustration with stacked event fields beneath.",
  },
  "record-label-promo": {
    id: "record-label-promo",
    label: "Record Label Promo Card",
    objectType: "Label promo postcard — catalog number band, A&R stamp, release announcement stock.",
    layoutStructure:
      "Label postcard — logo header, catalog strip, release caption, illustration as label art accent not hero poster.",
    compositionAnchors: "Label logo plate, catalog number, promo postcard margins.",
    avoidGenericLayout: "No concert bill poster layout. No giant centered event title monument.",
  },
  "fan-club-card": {
    id: "fan-club-card",
    label: "Fan Club Membership Card",
    objectType: "Fan club membership card — member number zone suggestion, club crest, collectible wallet card.",
    layoutStructure:
      "Wallet card proportions — crest top-left or center medallion, member ribbon, club motto band, intimate not billboard.",
    compositionAnchors: "Fan club crest, membership ribbon, wallet-card border.",
    avoidGenericLayout: "No full-bleed poster with event title dominating 60% of canvas.",
  },
  "album-release-invite": {
    id: "album-release-invite",
    label: "Album Release Invitation",
    objectType: "Album release invitation — listening party card, sleeve art fragment, invitation formal stock.",
    layoutStructure:
      "Invitation card — formal release announcement, sleeve fragment or label art as accent, RSVP-style caption bands.",
    compositionAnchors: "Invitation border, release date medallion, sleeve art inset.",
    avoidGenericLayout: "No generic event poster with years strip at bottom.",
  },
  "radio-vip-pass": {
    id: "radio-vip-pass",
    label: "Radio Station VIP Pass",
    objectType: "Radio station VIP pass — call letters dominant, station bumper stripe, on-air giveaway credential.",
    layoutStructure:
      "Station promo card — call letters as primary graphic element, frequency band, event as secondary giveaway line.",
    compositionAnchors: "Call-letter logo, dial frequency strip, station bumper frame.",
    avoidGenericLayout: "No generic laminate with horizontal metadata rows.",
  },
  "concert-credential": {
    id: "concert-credential",
    label: "Concert Credential",
    objectType: "Venue concert credential — hall admission plate, box office stamp, performance night keepsake.",
    layoutStructure:
      "Venue admission plate — hall name architecture band, performance night caption, admission seal not poster stack.",
    compositionAnchors: "Box office stamp, hall marquee band, admission night plate.",
    avoidGenericLayout: "No BIG TITLE / BIG ART / DATE / YEARS vertical stack.",
  },
  "tour-laminate": {
    id: "tour-laminate",
    label: "Tour Laminate",
    objectType: "Tour laminate — road crew credential, tour crest, city routing accent, arena circuit plate.",
    layoutStructure:
      "Tour laminate plate — tour crest centered, city routing accent strip, crew credential footer, road-worn premium stock.",
    compositionAnchors: "Tour crest, routing strip, laminate corner seals.",
    avoidGenericLayout: "No single hero illustration with four text bands beneath.",
  },
  "collector-pass": {
    id: "collector-pass",
    label: "Collector Pass",
    objectType: "Collector edition pass — numbered edition energy, memorabilia plate, premium keepsake stock.",
    layoutStructure:
      "Collectible edition card — ornate border, edition crest, event woven into frame not stacked fields, intimate scale.",
    compositionAnchors: "Edition crest, collector seal, memorabilia plate frame.",
    avoidGenericLayout: "No template poster with identical title-art-date-years hierarchy.",
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
    `Archetype seed ${seed} — this object type must materially change layout and composition.`,
    ``,
    `Layout structure: ${archetype.layoutStructure}`,
    `Composition anchors: ${archetype.compositionAnchors}`,
    ``,
    `FORBIDDEN GENERIC LAYOUT: ${archetype.avoidGenericLayout}`,
    `Do NOT produce: BIG TITLE → BIG ART → DATE → YEARS stacked poster template.`,
    `This must read as a distinct Retroverse collectible artifact — not decorated poster art.`,
  ].join("\n");
}

export function parseArtifactArchetypeChoice(raw: unknown): ArtifactArchetypeChoice {
  if (typeof raw === "string" && raw === "random") return "random";
  if (typeof raw === "string" && ARTIFACT_ARCHETYPE_IDS.includes(raw as ArtifactArchetypeId)) {
    return raw as ArtifactArchetypeId;
  }
  return DEFAULT_ARTIFACT_ARCHETYPE;
}
