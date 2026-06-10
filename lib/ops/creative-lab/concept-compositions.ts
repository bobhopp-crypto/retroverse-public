import type { ConceptVariationKey } from "./types";
import type { VisualWorldId } from "./visual-worlds";

export type ConceptComposition = {
  key: ConceptVariationKey;
  label: string;
  composition: string;
  typographyHierarchy: string;
  borderTreatment: string;
  numberingTreatment: string;
  ornamentation: string;
};

const NUMBERING_PANEL =
  "Sacred blank cream or white numbering panel at bottom center — empty interior, dark border, 26%×10% canvas, sized for rubber-stamp numbering. No generated numbers.";

const MUSIC_TV_COMPOSITIONS: ConceptComposition[] = [
  {
    key: "A",
    label: "MTV Broadcast Credential",
    composition:
      "1980s–90s MTV backstage pass structure — bold geometric header, broadcast graphic bands, laminate zones. Typography and graphics only — no characters or mascots.",
    typographyHierarchy:
      "Oversized SUNDAY NIGHTS in bold sans caps. VIP / BACKSTAGE hierarchy. Venue and date in credential metadata bands above the numbering panel.",
    borderTreatment: "Laminated pass edge with neon accent bars and geometric broadcast frame; numbering panel clear at bottom center.",
    numberingTreatment: NUMBERING_PANEL,
    ornamentation: "Neon triangles, scan-line accents, geometric MTV-era shapes — none overlapping the numbering panel.",
  },
  {
    key: "B",
    label: "VIP All Access Laminate",
    composition:
      "Tour-style all-access laminate — security color blocks, access tier labels, holographic-foil suggestion without numbers. Adult collectible credential layout.",
    typographyHierarchy:
      "ALL ACCESS and VIP dominate in heavy block type. Event, venue, date stacked in laminate hierarchy above the numbering panel.",
    borderTreatment: "Thick laminate border with rounded credential corners and foil-edge suggestion.",
    numberingTreatment: NUMBERING_PANEL,
    ornamentation: "Diagonal hazard stripes, access-zone color blocks, music-industry laminate cues — none overlapping the numbering panel.",
  },
  {
    key: "C",
    label: "Concert Guest Pass",
    composition:
      "Concert guest credential — production-company plate energy, guest-of-honor hierarchy, stage-door laminate. Graphic and typographic only.",
    typographyHierarchy:
      "GUEST in broadcast caps. Event name secondary. Venue and date in production-credential footer above the numbering panel.",
    borderTreatment: "Guest-pass frame with perforated-edge suggestion and studio-plate trim.",
    numberingTreatment: NUMBERING_PANEL,
    ornamentation: "Microphone silhouette, spotlight geometry, stage-light beams as flat graphics — no characters, none overlapping the numbering panel.",
  },
  {
    key: "D",
    label: "Music Television Collector Pass",
    composition:
      "VH1 / music-television collector laminate — premium memorabilia layout for wallet or scrapbook. Bold type, geometric neon, adult music-culture aesthetic.",
    typographyHierarchy:
      "Collector-grade event title in display caps. Featured years as accent strip. Metadata band above the numbering panel.",
    borderTreatment: "Premium collector laminate with geometric corner seals and broadcast-era framing.",
    numberingTreatment: NUMBERING_PANEL,
    ornamentation: "Music-note geometry, neon grid accents, broadcast test-pattern hints — none overlapping the numbering panel.",
  },
];

const DEFAULT_COMPOSITIONS: ConceptComposition[] = [
  {
    key: "A",
    label: "Sunburst Centerpiece",
    composition: "Illustrated sunburst or hero emblem dominates center 70% of pass. Event text sits above the bottom-center numbering panel.",
    typographyHierarchy: "Large hand-lettered event title arched above center art. Venue and date as secondary line above the numbering panel.",
    borderTreatment: "Ornate full-bleed decorative border framing the entire pass; bottom-center numbering panel left clear.",
    numberingTreatment: NUMBERING_PANEL,
    ornamentation: "Corner flourishes, radiating lines, festival motifs at border midpoints — none overlapping the numbering panel.",
  },
  {
    key: "B",
    label: "Vertical Marquee",
    composition: "Vertical marquee layout — title stack left third, large illustration right two-thirds.",
    typographyHierarchy: "Stacked bold title blocks running vertically. Years as accent strip along edge.",
    borderTreatment: "Double-line frame with decorative side panels.",
    numberingTreatment: NUMBERING_PANEL,
    ornamentation: "Side vine scrolls or action lines flanking the title column — none overlapping the numbering panel.",
  },
  {
    key: "C",
    label: "Banner Header",
    composition: "Wide illustrated banner across top 40%. Central emblem below. Footer band above numbering panel.",
    typographyHierarchy: "Banner carries main event name in display type. Date and venue in compact band above the numbering panel.",
    borderTreatment: "Simple thick frame with accent band under header.",
    numberingTreatment: NUMBERING_PANEL,
    ornamentation: "Header band patterns, small icons in banner corners — none overlapping the numbering panel.",
  },
  {
    key: "D",
    label: "Badge Crest",
    composition: "Symmetric crest or badge centered. Balanced ornamental symmetry left and right.",
    typographyHierarchy: "Event name inside crest circle. Supporting lines in ribbon above the numbering panel.",
    borderTreatment: "Symmetrical ornamental frame with mirrored corner medallions.",
    numberingTreatment: NUMBERING_PANEL,
    ornamentation: "Matched corner seals, ribbon banners, symmetrical filigree — none overlapping the numbering panel.",
  },
];

const COMPOSITIONS_BY_WORLD: Partial<Record<VisualWorldId, ConceptComposition[]>> = {
  "music-television-credential": MUSIC_TV_COMPOSITIONS,
};

export function compositionForKey(
  key: ConceptVariationKey,
  worldId?: VisualWorldId | string | null,
): ConceptComposition {
  const set =
    worldId && COMPOSITIONS_BY_WORLD[worldId as VisualWorldId]
      ? COMPOSITIONS_BY_WORLD[worldId as VisualWorldId]!
      : DEFAULT_COMPOSITIONS;
  return set.find((c) => c.key === key) ?? set[0];
}
