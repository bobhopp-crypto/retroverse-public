import type { ConceptVariationKey } from "./types";

export type VisualWorldId =
  | "psychedelic-festival"
  | "music-television-credential"
  | "vintage-television"
  | "collector-memorabilia"
  | "rock-poster"
  | "concert-backstage-laminate";

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
    id: "music-television-credential",
    title: "Music Television Credential",
    description:
      "Authentic 1980s–1990s music television credentials — MTV backstage passes, VH1 laminates, concert guest passes, production badges. Bold typography, geometric graphics, neon accents. Collectible but adult — music culture, not cartoon culture.",
    visualReferences: [
      "MTV backstage passes",
      "VH1 credentials",
      "Concert laminates",
      "Music industry guest passes",
      "Television production credentials",
      "All-access badges",
      "VIP event passes",
    ],
    typographyStyle: "Bold sans caps, broadcast display type, credential hierarchy, laminate security lettering",
    borderStyle: "Laminated pass edge, geometric broadcast frame, neon accent bars, foil-edge suggestion",
    colorTreatment: "Black and charcoal base with hot pink, electric cyan, and gold neon accents on cream laminate stock",
    palette: ["#0d0d0d", "#ff2d6a", "#00e5ff", "#f4c430", "#f5f0e8"],
    heroGradient: "linear-gradient(145deg, #0d0d0d 0%, #ff2d6a 45%, #00e5ff 100%)",
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
    description: "Archival keepsake framing — foil corners, ticket-stub soul, blank numbering panel for post-print stamp.",
    visualReferences: ["Trading cards", "Concert ticket stubs", "Souvenir programs", "Collectible seals"],
    typographyStyle: "Editorial serif edition lines, museum label caps — no printed serial numbers",
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
    id: "concert-backstage-laminate",
    title: "Concert Backstage Laminate",
    description:
      "Tour laminate authority — stage-door credentials, security zones, road-case wear. Bold adult music-industry pass for wallet or scrapbook keepsake.",
    visualReferences: ["Tour laminates", "Stage-door passes", "Road crew credentials", "Festival backstage badges"],
    typographyStyle: "Heavy security caps, laminate zone labels, road-tour block type",
    borderStyle: "Thick laminate border, rounded credential corners, security stripe bands",
    colorTreatment: "High-contrast ink on white laminate with red, gold, and black access zones",
    palette: ["#1a1a1a", "#c41e3a", "#f4c430", "#f5f0e8", "#2d4a6e"],
    heroGradient: "linear-gradient(145deg, #1a1a1a 0%, #c41e3a 50%, #f4c430 100%)",
  },
];

/** Map legacy world ids from older projects. */
export function normalizeVisualWorldId(id: string | null | undefined): VisualWorldId | null {
  if (!id) return null;
  if (id === "saturday-morning-cartoon") return "music-television-credential";
  if (id === "retro-disney-adventure") return "concert-backstage-laminate";
  if (VISUAL_WORLDS.some((w) => w.id === id)) return id as VisualWorldId;
  return null;
}

export function visualWorldById(id: VisualWorldId | string | null | undefined): VisualWorld {
  const normalized = normalizeVisualWorldId(id) ?? "psychedelic-festival";
  return VISUAL_WORLDS.find((w) => w.id === normalized) ?? VISUAL_WORLDS[0];
}

/** Legacy A–D keys map to concept slot labels only — all share the selected visual world. */
export const CONCEPT_KEYS: ConceptVariationKey[] = ["A", "B", "C", "D"];
