import type { ConceptVariationKey } from "./types";

export type ConceptComposition = {
  key: ConceptVariationKey;
  label: string;
  composition: string;
  typographyHierarchy: string;
  borderTreatment: string;
  numberingTreatment: string;
  ornamentation: string;
};

export const CONCEPT_COMPOSITIONS: ConceptComposition[] = [
  {
    key: "A",
    label: "Sunburst Centerpiece",
    composition: "Illustrated sunburst or hero emblem dominates center 70% of pass. Event text integrated into lower fifth.",
    typographyHierarchy: "Large hand-lettered event title arched above center art. Venue and date as secondary line beneath.",
    borderTreatment: "Ornate full-bleed decorative border framing the entire pass.",
    numberingTreatment: "Small edition stamp bottom-right corner, subtle foil-style.",
    ornamentation: "Corner flourishes, radiating lines, festival motifs at border midpoints.",
  },
  {
    key: "B",
    label: "Vertical Marquee",
    composition: "Vertical marquee layout — title stack left third, large illustration right two-thirds.",
    typographyHierarchy: "Stacked bold title blocks running vertically. Years as accent strip along edge.",
    borderTreatment: "Double-line frame with decorative side panels.",
    numberingTreatment: "Vertical serial number along left margin.",
    ornamentation: "Side vine scrolls or action lines flanking the title column.",
  },
  {
    key: "C",
    label: "Banner Header",
    composition: "Wide illustrated banner across top 40%. Central character or emblem below. Minimal lower info strip.",
    typographyHierarchy: "Banner carries main event name in display type. Date and venue in compact footer band.",
    borderTreatment: "Simple thick frame with accent band under header.",
    numberingTreatment: "Centered edition badge below main art, ticket-stub style.",
    ornamentation: "Header band patterns, small icons in banner corners.",
  },
  {
    key: "D",
    label: "Badge Crest",
    composition: "Symmetric crest or badge centered. Balanced ornamental symmetry left and right.",
    typographyHierarchy: "Event name inside crest circle. Supporting lines in ribbon beneath crest.",
    borderTreatment: "Symmetrical ornamental frame with mirrored corner medallions.",
    numberingTreatment: "Large hero edition number inside crest or directly below.",
    ornamentation: "Matched corner seals, ribbon banners, symmetrical filigree.",
  },
];

export function compositionForKey(key: ConceptVariationKey): ConceptComposition {
  return CONCEPT_COMPOSITIONS.find((c) => c.key === key) ?? CONCEPT_COMPOSITIONS[0];
}
