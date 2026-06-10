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

const MUSIC_TV_REFINEMENTS: ArtRefinementTreatment[] = [
  { id: "mtv-neon", label: "Neon broadcast grid", borderTreatment: "neon-frame", typography: "bold-sans-caps", illustrationDensity: "medium", numberingTreatment: "blank-panel", decorativeMotif: "geometric-grid", layoutEmphasis: "title-dominant" },
  { id: "mtv-backstage", label: "MTV backstage laminate", borderTreatment: "laminate-edge", typography: "security-bold", illustrationDensity: "light", numberingTreatment: "blank-panel", decorativeMotif: "access-stripes", layoutEmphasis: "credential-plate" },
  { id: "vh1-gold", label: "VH1 gold trim", borderTreatment: "gold-trim", typography: "broadcast-serif", illustrationDensity: "medium", numberingTreatment: "blank-panel", decorativeMotif: "foil-band", layoutEmphasis: "center-crest" },
  { id: "mtv-scan", label: "Scan-line broadcast", borderTreatment: "crt-frame", typography: "display-caps", illustrationDensity: "medium", numberingTreatment: "blank-panel", decorativeMotif: "scan-lines", layoutEmphasis: "horizontal-band" },
  { id: "mtv-geometric", label: "Geometric neon blocks", borderTreatment: "color-block", typography: "stacked-caps", illustrationDensity: "light", numberingTreatment: "blank-panel", decorativeMotif: "neon-triangle", layoutEmphasis: "vertical-marquee" },
  { id: "mtv-guest", label: "Guest credential plate", borderTreatment: "studio-plate", typography: "guest-caps", illustrationDensity: "light", numberingTreatment: "blank-panel", decorativeMotif: "spotlight-beam", layoutEmphasis: "badge-dominant" },
  { id: "mtv-collector", label: "Collector laminate", borderTreatment: "foil-edge", typography: "collector-serif", illustrationDensity: "medium", numberingTreatment: "blank-panel", decorativeMotif: "music-note-geo", layoutEmphasis: "symmetric-frame" },
  { id: "mtv-tour", label: "Tour laminate", borderTreatment: "tour-stripe", typography: "road-case-bold", illustrationDensity: "medium", numberingTreatment: "blank-panel", decorativeMotif: "hazard-stripe", layoutEmphasis: "wide-banner" },
];

const CONCERT_LAMINATE_REFINEMENTS: ArtRefinementTreatment[] = [
  { id: "lam-stage", label: "Stage-door pass", borderTreatment: "laminate-edge", typography: "security-caps", illustrationDensity: "light", numberingTreatment: "blank-panel", decorativeMotif: "spotlight", layoutEmphasis: "credential-plate" },
  { id: "lam-tour", label: "Tour crew laminate", borderTreatment: "rounded-laminate", typography: "road-bold", illustrationDensity: "medium", numberingTreatment: "blank-panel", decorativeMotif: "hazard-stripe", layoutEmphasis: "access-zones" },
  { id: "lam-vip", label: "VIP all-access", borderTreatment: "foil-border", typography: "vip-caps", illustrationDensity: "light", numberingTreatment: "blank-panel", decorativeMotif: "gold-band", layoutEmphasis: "title-dominant" },
  { id: "lam-festival", label: "Festival backstage", borderTreatment: "perforated-edge", typography: "festival-bold", illustrationDensity: "medium", numberingTreatment: "blank-panel", decorativeMotif: "star-burst", layoutEmphasis: "horizontal-strip" },
  { id: "lam-guest", label: "Guest of honor", borderTreatment: "guest-frame", typography: "guest-serif", illustrationDensity: "light", numberingTreatment: "blank-panel", decorativeMotif: "ribbon-seal", layoutEmphasis: "center-crest" },
  { id: "lam-road", label: "Road case wear", borderTreatment: "scuffed-edge", typography: "distressed-caps", illustrationDensity: "medium", numberingTreatment: "blank-panel", decorativeMotif: "tape-strip", layoutEmphasis: "vertical-marquee" },
  { id: "lam-neon", label: "Neon marquee", borderTreatment: "neon-edge", typography: "marquee-bold", illustrationDensity: "medium", numberingTreatment: "blank-panel", decorativeMotif: "neon-glow", layoutEmphasis: "wide-banner" },
  { id: "lam-collector", label: "Wallet keepsake", borderTreatment: "premium-laminate", typography: "collector-caps", illustrationDensity: "light", numberingTreatment: "blank-panel", decorativeMotif: "foil-corner", layoutEmphasis: "symmetric-frame" },
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

const ROCK_POSTER_REFINEMENTS: ArtRefinementTreatment[] = [
  { id: "rock-screen", label: "Screen print classic", borderTreatment: "screen-edge", typography: "stacked-poster", illustrationDensity: "heavy", numberingTreatment: "corner-stamp", decorativeMotif: "ink-splatter", layoutEmphasis: "silhouette-hero" },
  { id: "rock-gig", label: "Club handbill tear", borderTreatment: "torn-paper", typography: "distressed-caps", illustrationDensity: "medium", numberingTreatment: "serial-line", decorativeMotif: "guitar-silhouette", layoutEmphasis: "wide-banner" },
  { id: "rock-neon", label: "Neon marquee glow", borderTreatment: "neon-frame", typography: "marquee-bold", illustrationDensity: "medium", numberingTreatment: "ticket-no", decorativeMotif: "spotlight", layoutEmphasis: "title-dominant" },
  { id: "rock-vintage", label: "Vintage silkscreen", borderTreatment: "registration-marks", typography: "block-serif", illustrationDensity: "heavy", numberingTreatment: "edition-stamp", decorativeMotif: "halftone", layoutEmphasis: "center-crest" },
  { id: "rock-punk", label: "Punk zine energy", borderTreatment: "xerox-edge", typography: "cut-and-paste", illustrationDensity: "heavy", numberingTreatment: "hand-stamped", decorativeMotif: "safety-pin", layoutEmphasis: "collage" },
  { id: "rock-minimal", label: "Minimal ink block", borderTreatment: "rough-rect", typography: "single-weight", illustrationDensity: "light", numberingTreatment: "subtle-no", decorativeMotif: "single-icon", layoutEmphasis: "negative-space" },
  { id: "rock-festival", label: "Festival lineup poster", borderTreatment: "multi-band-frame", typography: "lineup-stack", illustrationDensity: "medium", numberingTreatment: "day-badge", decorativeMotif: "star-burst", layoutEmphasis: "vertical-marquee" },
  { id: "rock-maximal", label: "Maximal gig collage", borderTreatment: "layered-posters", typography: "mixed-weights", illustrationDensity: "heavy", numberingTreatment: "foil-badge", decorativeMotif: "multi-icon", layoutEmphasis: "layered-depth" },
];

export const ART_REFINEMENT_TREATMENTS: Partial<Record<ArtDirectionId, ArtRefinementTreatment[]>> & Record<import("./visual-worlds").VisualWorldId, ArtRefinementTreatment[]> = {
  "psychedelic-festival": PSYCHEDELIC_REFINEMENTS,
  "music-television-credential": MUSIC_TV_REFINEMENTS,
  "vintage-television": TELEVISION_REFINEMENTS,
  "collector-memorabilia": COLLECTOR_REFINEMENTS,
  "rock-poster": ROCK_POSTER_REFINEMENTS,
  "concert-backstage-laminate": CONCERT_LAMINATE_REFINEMENTS,
};

export function refinementsForArtDirection(id: ArtDirectionId | string): ArtRefinementTreatment[] {
  return ART_REFINEMENT_TREATMENTS[id as ArtDirectionId] ?? PSYCHEDELIC_REFINEMENTS;
}
