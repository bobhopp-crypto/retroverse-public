import type { ConceptVariationKey } from "./types";

export type VisualWorldId =
  | "psychedelic-festival"
  | "saturday-morning-cartoon"
  | "vintage-television"
  | "collector-memorabilia"
  | "rock-poster"
  | "retro-disney-adventure";

export type VisualWorld = {
  id: VisualWorldId;
  title: string;
  description: string;
  visualReferences: string[];
  typographyStyle: string;
  borderStyle: string;
  colorTreatment: string;
  palette: string[];
  /** CSS gradient for card hero when no image yet */
  heroGradient: string;
};

export const VISUAL_WORLDS: VisualWorld[] = [
  {
    id: "psychedelic-festival",
    title: "Psychedelic Festival",
    description: "Fillmore poster energy — flower power, hand-drawn flourishes, sunburst illustration dominating the pass.",
    visualReferences: ["Fillmore posters", "Woodstock", "1967 festival credentials", "Hand-lettered rock posters"],
    typographyStyle: "Swash serif headlines, groovy hand lettering, peace-era display type",
    borderStyle: "Ornate paisley frame, flower-power corners, radiating border bands",
    colorTreatment: "Hot orange, gold, crimson, deep purple on aged cream stock",
    palette: ["#e85d2a", "#f4c430", "#c41e3a", "#2d1b4e", "#f5e6c8"],
    heroGradient: "linear-gradient(145deg, #e85d2a 0%, #f4c430 40%, #2d1b4e 100%)",
  },
  {
    id: "saturday-morning-cartoon",
    title: "Saturday Morning Cartoon",
    description: "Hanna-Barbera collectible — thick outlines, playful characters, cel-animation flat color.",
    visualReferences: ["Flintstones", "Jetsons", "Rocky & Bullwinkle", "Saturday morning title cards"],
    typographyStyle: "Bold cartoon caps, playful rounded sans, chunky outline lettering",
    borderStyle: "Thick ink outline frame, halftone corners, action-line accents",
    colorTreatment: "Flat teal, orange, yellow primaries on cream with heavy black ink",
    palette: ["#ff6b35", "#4ecdc4", "#ffe66d", "#1a1a2e", "#f7f7f2"],
    heroGradient: "linear-gradient(145deg, #4ecdc4 0%, #ffe66d 50%, #ff6b35 100%)",
  },
  {
    id: "vintage-television",
    title: "Vintage Television",
    description: "Golden-era TV glamour — studio guest plates, ON AIR badges, broadcast-era credentials.",
    visualReferences: ["Midnight Special", "TV Guide covers", "Network backstage passes", "Variety show graphics"],
    typographyStyle: "Broadcast serif, network ID caps, studio guest plate lettering",
    borderStyle: "TV bezel frame, gold trim laminate, scan-line texture bands",
    colorTreatment: "Navy studio backdrop, gold accents, cream type, red ON AIR dot",
    palette: ["#1a2744", "#c9a227", "#e8e4d8", "#8b0000", "#2d4a6e"],
    heroGradient: "linear-gradient(145deg, #1a2744 0%, #2d4a6e 50%, #c9a227 100%)",
  },
  {
    id: "collector-memorabilia",
    title: "Collector Memorabilia",
    description: "Archival keepsake framing — numbered editions, foil corners, ticket-stub soul.",
    visualReferences: ["Trading cards", "Concert ticket stubs", "Souvenir programs", "Limited edition seals"],
    typographyStyle: "Editorial serif edition lines, engraved numbering, museum label caps",
    borderStyle: "Trading-card frame, perforated edge, foil corner seals",
    colorTreatment: "Warm tan stock, gold foil, brown ink, archival cream panels",
    palette: ["#d4a574", "#8b6914", "#f5e6c8", "#2d2d2d", "#b8860b"],
    heroGradient: "linear-gradient(145deg, #d4a574 0%, #f5e6c8 50%, #b8860b 100%)",
  },
  {
    id: "rock-poster",
    title: "Rock Poster",
    description: "Screen-print gig poster authority — bold silhouette, stacked headline, screen texture.",
    visualReferences: ["Gig posters", "Screen print rock art", "Club handbills", "Silkscreen texture"],
    typographyStyle: "Stacked block poster type, distressed headline, all-caps marquee",
    borderStyle: "Rough screen-print edge, torn-paper margin, ink bleed border",
    colorTreatment: "High-contrast ink on off-white, limited palette screen-print look",
    palette: ["#1a1a1a", "#e85d2a", "#f4c430", "#c41e3a", "#f0ead6"],
    heroGradient: "linear-gradient(145deg, #1a1a1a 0%, #c41e3a 50%, #f4c430 100%)",
  },
  {
    id: "retro-disney-adventure",
    title: "Retro Disney Adventure",
    description: "Mid-century adventure park charm — storybook illustration, whimsical borders, enchanted collectible.",
    visualReferences: ["1950s park maps", "Storybook illustration", "Mid-century adventure graphics", "Enchanted ticket art"],
    typographyStyle: "Storybook serif, whimsical hand lettering, adventure park display caps",
    borderStyle: "Storybook scroll border, star-sparkle corners, ticket-shaped frame",
    colorTreatment: "Sky blue, warm gold, storybook cream, enchanted teal accents",
    palette: ["#4a90a4", "#f4c430", "#e8d5b7", "#2d5a4a", "#fff8f0"],
    heroGradient: "linear-gradient(145deg, #4a90a4 0%, #f4c430 45%, #2d5a4a 100%)",
  },
];

export function visualWorldById(id: VisualWorldId | string | null | undefined): VisualWorld {
  return VISUAL_WORLDS.find((w) => w.id === id) ?? VISUAL_WORLDS[0];
}

/** Legacy A–D keys map to concept slot labels only — all share the selected visual world. */
export const CONCEPT_KEYS: ConceptVariationKey[] = ["A", "B", "C", "D"];
