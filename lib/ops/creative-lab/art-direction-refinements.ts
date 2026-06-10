import type { ArtDirectionId } from "./art-directions";

export type ArtRefinementTreatment = {
  id: string;
  label: string;
  borderTreatment: string;
  typography: string;
  illustrationDensity: "light" | "medium" | "heavy";
  numberingTreatment: string;
  decorativeMotif: string;
  layoutEmphasis: string;
};

const PSYCHEDELIC_REFINEMENTS: ArtRefinementTreatment[] = [
  { id: "psy-ornate", label: "Ornate paisley border", borderTreatment: "ornate-paisley", typography: "hand-lettered", illustrationDensity: "heavy", numberingTreatment: "handwritten-no", decorativeMotif: "flourishes", layoutEmphasis: "center-sunburst" },
  { id: "psy-poster", label: "Fillmore poster frame", borderTreatment: "poster-frame", typography: "psychedelic-serif", illustrationDensity: "heavy", numberingTreatment: "corner-stamp", decorativeMotif: "peace-sign", layoutEmphasis: "vertical-marquee" },
  { id: "psy-flower", label: "Flower power wreath", borderTreatment: "flower-wreath", typography: "swash-caps", illustrationDensity: "medium", numberingTreatment: "bottom-line", decorativeMotif: "daisy-chain", layoutEmphasis: "crowd-silhouette" },
  { id: "psy-woodstock", label: "Woodstock field energy", borderTreatment: "torn-edge", typography: "block-groovy", illustrationDensity: "medium", numberingTreatment: "ticket-serial", decorativeMotif: "guitar-neck", layoutEmphasis: "wide-banner" },
  { id: "psy-rainbow", label: "Rainbow gradient bands", borderTreatment: "rainbow-bands", typography: "bubble-letter", illustrationDensity: "heavy", numberingTreatment: "foil-stamp", decorativeMotif: "starburst", layoutEmphasis: "radiating-rays" },
  { id: "psy-minimal", label: "Minimal flower accent", borderTreatment: "thin-floral", typography: "clean-serif", illustrationDensity: "light", numberingTreatment: "subtle-no", decorativeMotif: "single-bloom", layoutEmphasis: "title-dominant" },
  { id: "psy-vintage", label: "Aged paper patina", borderTreatment: "aged-patina", typography: "distressed-type", illustrationDensity: "medium", numberingTreatment: "vintage-serial", decorativeMotif: "vine-scroll", layoutEmphasis: "symmetric-frame" },
  { id: "psy-maximal", label: "Maximal festival collage", borderTreatment: "collage-border", typography: "mixed-lettering", illustrationDensity: "heavy", numberingTreatment: "edition-badge", decorativeMotif: "multi-icon", layoutEmphasis: "layered-depth" },
];

const CARTOON_REFINEMENTS: ArtRefinementTreatment[] = [
  { id: "toon-cel", label: "Cel animation classic", borderTreatment: "thick-outline", typography: "cartoon-bold", illustrationDensity: "heavy", numberingTreatment: "star-badge", decorativeMotif: "action-lines", layoutEmphasis: "character-hero" },
  { id: "toon-hanna", label: "Hanna-Barbera flat", borderTreatment: "rounded-corners", typography: "playful-sans", illustrationDensity: "medium", numberingTreatment: "bubble-no", decorativeMotif: "halftone-dots", layoutEmphasis: "horizontal-strip" },
  { id: "toon-flint", label: "Stone-age charm", borderTreatment: "rock-frame", typography: "prehistoric-bold", illustrationDensity: "medium", numberingTreatment: "bone-carved", decorativeMotif: "spot-gag", layoutEmphasis: "family-group" },
  { id: "toon-jetson", label: "Space-age chrome", borderTreatment: "atomic-curve", typography: "futurist", illustrationDensity: "medium", numberingTreatment: "digital-no", decorativeMotif: "orbit-rings", layoutEmphasis: "skyline" },
  { id: "toon-bullwinkle", label: "Deadpan charm", borderTreatment: "flat-color-block", typography: "witty-serif", illustrationDensity: "light", numberingTreatment: "simple-stamp", decorativeMotif: "speech-bubble", layoutEmphasis: "title-card" },
  { id: "toon-sticker", label: "Sticker sheet collectible", borderTreatment: "die-cut", typography: "chunky-outline", illustrationDensity: "heavy", numberingTreatment: "peel-back-no", decorativeMotif: "star-burst", layoutEmphasis: "mascot-center" },
  { id: "toon-comic", label: "Sunday comics panel", borderTreatment: "panel-grid", typography: "comic-caption", illustrationDensity: "medium", numberingTreatment: "panel-number", decorativeMotif: "ben-day", layoutEmphasis: "multi-panel" },
  { id: "toon-toy", label: "Toy box packaging", borderTreatment: "blister-frame", typography: "toy-logo", illustrationDensity: "heavy", numberingTreatment: "barcode-style", decorativeMotif: "sparkle", layoutEmphasis: "product-hero" },
];

const TELEVISION_REFINEMENTS: ArtRefinementTreatment[] = [
  { id: "tv-guest", label: "Studio guest plate", borderTreatment: "tv-bezel", typography: "network-serif", illustrationDensity: "medium", numberingTreatment: "guest-no", decorativeMotif: "on-air-dot", layoutEmphasis: "credential-plate" },
  { id: "tv-midnight", label: "Midnight Special glow", borderTreatment: "stage-curtain", typography: "variety-show", illustrationDensity: "heavy", numberingTreatment: "spotlight-no", decorativeMotif: "spotlight-beam", layoutEmphasis: "performer-silhouette" },
  { id: "tv-guide", label: "TV Guide cover", borderTreatment: "magazine-frame", typography: "headline-stack", illustrationDensity: "medium", numberingTreatment: "issue-no", decorativeMotif: "channel-logo", layoutEmphasis: "cover-lines" },
  { id: "tv-backstage", label: "Backstage laminate", borderTreatment: "laminate-edge", typography: "security-bold", illustrationDensity: "light", numberingTreatment: "access-code", decorativeMotif: "barcode", layoutEmphasis: "access-zones" },
  { id: "tv-scan", label: "Scan line broadcast", borderTreatment: "crt-frame", typography: "broadcast-mono", illustrationDensity: "medium", numberingTreatment: "timecode", decorativeMotif: "scan-lines", layoutEmphasis: "horizontal-band" },
  { id: "tv-retro", label: "Retro variety card", borderTreatment: "gold-trim", typography: "art-deco", illustrationDensity: "medium", numberingTreatment: "gold-foil-no", decorativeMotif: "microphone", layoutEmphasis: "center-stage" },
  { id: "tv-network", label: "Network ID badge", borderTreatment: "circle-badge", typography: "network-caps", illustrationDensity: "light", numberingTreatment: "badge-serial", decorativeMotif: "call-letters", layoutEmphasis: "badge-dominant" },
  { id: "tv-color", label: "Color test pattern", borderTreatment: "test-bars", typography: "technical", illustrationDensity: "heavy", numberingTreatment: "test-id", decorativeMotif: "color-bars", layoutEmphasis: "geometric" },
];

const COLLECTOR_REFINEMENTS: ArtRefinementTreatment[] = [
  { id: "col-card", label: "Trading card frame", borderTreatment: "card-frame", typography: "stats-panel", illustrationDensity: "medium", numberingTreatment: "card-serial", decorativeMotif: "foil-corner", layoutEmphasis: "portrait-card" },
  { id: "col-stub", label: "Ticket stub tear", borderTreatment: "perforated", typography: "ticket-serif", illustrationDensity: "light", numberingTreatment: "admit-one", decorativeMotif: "tear-line", layoutEmphasis: "stub-layout" },
  { id: "col-program", label: "Souvenir program", borderTreatment: "program-fold", typography: "editorial", illustrationDensity: "medium", numberingTreatment: "program-no", decorativeMotif: "ribbon-seal", layoutEmphasis: "booklet-cover" },
  { id: "col-foil", label: "Foil stamp edition", borderTreatment: "foil-border", typography: "luxury-serif", illustrationDensity: "medium", numberingTreatment: "gold-emboss", decorativeMotif: "wax-seal", layoutEmphasis: "center-crest" },
  { id: "col-archive", label: "Archival sleeve", borderTreatment: "archive-pocket", typography: "museum-label", illustrationDensity: "light", numberingTreatment: "catalog-no", decorativeMotif: "acid-free", layoutEmphasis: "label-dominant" },
  { id: "col-limited", label: "Limited edition seal", borderTreatment: "hologram-edge", typography: "edition-caps", illustrationDensity: "heavy", numberingTreatment: "edition-of", decorativeMotif: "hologram", layoutEmphasis: "number-hero" },
  { id: "col-vintage", label: "Vintage ticket stock", borderTreatment: "aged-stock", typography: "typewriter", illustrationDensity: "light", numberingTreatment: "vintage-serial", decorativeMotif: "cancellation", layoutEmphasis: "horizontal-ticket" },
  { id: "col-display", label: "Display case plaque", borderTreatment: "plaque-frame", typography: "engraved", illustrationDensity: "medium", numberingTreatment: "plaque-no", decorativeMotif: "brass-plate", layoutEmphasis: "commemorative" },
];

export const ART_REFINEMENT_TREATMENTS: Record<ArtDirectionId, ArtRefinementTreatment[]> = {
  "psychedelic-festival": PSYCHEDELIC_REFINEMENTS,
  "saturday-morning-cartoon": CARTOON_REFINEMENTS,
  "vintage-television": TELEVISION_REFINEMENTS,
  "collector-memorabilia": COLLECTOR_REFINEMENTS,
};

export function refinementsForArtDirection(id: ArtDirectionId): ArtRefinementTreatment[] {
  return ART_REFINEMENT_TREATMENTS[id] ?? PSYCHEDELIC_REFINEMENTS;
}
