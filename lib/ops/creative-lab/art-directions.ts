import type { VisualWorldId } from "./visual-worlds";
import { VISUAL_WORLDS } from "./visual-worlds";
import type { ConceptVariationKey } from "./types";

export type ArtDirectionId = VisualWorldId;

export type CollectibilityLevel = "High" | "Very High" | "Medium";

export type ArtDirection = {
  id: ArtDirectionId;
  key: ConceptVariationKey;
  title: string;
  subtitle: string;
  styleChips: string[];
  collectibility: CollectibilityLevel;
  whyThisWorks: string;
  palette: string[];
};

export const ART_DIRECTIONS: ArtDirection[] = [
  {
    id: "psychedelic-festival",
    key: "A",
    title: "Psychedelic Festival",
    subtitle: "Fillmore posters · Woodstock · flower power",
    styleChips: ["Flower Power", "Festival Poster", "Hand Lettering", "1960s"],
    collectibility: "Very High",
    whyThisWorks: "Feels like a rare festival credential somebody would keep for 40 years.",
    palette: ["#e85d2a", "#f4c430", "#c41e3a", "#2d1b4e", "#f5e6c8"],
  },
  {
    id: "saturday-morning-cartoon",
    key: "B",
    title: "Saturday Morning Cartoon",
    subtitle: "Flintstones · Jetsons · Hanna-Barbera energy",
    styleChips: ["Cel Animation", "Playful", "Character-Driven", "Collectible"],
    collectibility: "High",
    whyThisWorks: "Playful and character-driven — like a cartoon you want to clip and save.",
    palette: ["#ff6b35", "#4ecdc4", "#ffe66d", "#1a1a2e", "#f7f7f2"],
  },
  {
    id: "vintage-television",
    key: "C",
    title: "Vintage Television",
    subtitle: "Variety shows · Midnight Special · TV credentials",
    styleChips: ["Broadcast Era", "Studio Guest", "Network Badge", "1970s TV"],
    collectibility: "High",
    whyThisWorks: "Studio-guest glamour — backstage pass energy from the golden TV era.",
    palette: ["#1a2744", "#c9a227", "#e8e4d8", "#8b0000", "#2d4a6e"],
  },
  {
    id: "collector-memorabilia",
    key: "D",
    title: "Collector Memorabilia",
    subtitle: "Trading cards · ticket stubs · numbered editions",
    styleChips: ["Trading Card", "Ticket Stub", "Numbered Edition", "Keepsake"],
    collectibility: "Very High",
    whyThisWorks: "Archival souvenir framing — the pass becomes a numbered collectible artifact.",
    palette: ["#d4a574", "#8b6914", "#f5e6c8", "#2d2d2d", "#b8860b"],
  },
  {
    id: "rock-poster",
    key: "A",
    title: "Rock Poster",
    subtitle: "Gig posters · screen print · club handbills",
    styleChips: ["Screen Print", "Gig Poster", "Silkscreen", "Bold Ink"],
    collectibility: "Very High",
    whyThisWorks: "Screen-print authority — looks like a legendary club poster shrunk to pass size.",
    palette: ["#1a1a1a", "#e85d2a", "#f4c430", "#c41e3a", "#f0ead6"],
  },
  {
    id: "retro-disney-adventure",
    key: "B",
    title: "Retro Disney Adventure",
    subtitle: "Storybook parks · mid-century enchantment",
    styleChips: ["Storybook", "Adventure Park", "Whimsical", "Enchanted"],
    collectibility: "High",
    whyThisWorks: "Mid-century adventure park charm — whimsical borders and storybook illustration.",
    palette: ["#4a90a4", "#f4c430", "#e8d5b7", "#2d5a4a", "#fff8f0"],
  },
];

/** All six art-directed worlds from structured presets. */
export const ALL_ART_DIRECTIONS: ArtDirection[] = VISUAL_WORLDS.map((w) => ({
  id: w.id,
  key: "A" as ConceptVariationKey,
  title: w.title,
  subtitle: w.visualReferences.slice(0, 2).join(" · "),
  styleChips: w.visualReferences.slice(0, 4),
  collectibility: "High" as CollectibilityLevel,
  whyThisWorks: w.description,
  palette: w.palette,
}));

export const ART_DIRECTION_BY_KEY: Record<ConceptVariationKey, ArtDirectionId> = {
  A: "psychedelic-festival",
  B: "saturday-morning-cartoon",
  C: "vintage-television",
  D: "collector-memorabilia",
};

export function artDirectionByKey(key: ConceptVariationKey | string | undefined): ArtDirection {
  const id = key && key in ART_DIRECTION_BY_KEY ? ART_DIRECTION_BY_KEY[key as ConceptVariationKey] : "psychedelic-festival";
  return ART_DIRECTIONS.find((d) => d.id === id) ?? ART_DIRECTIONS[0];
}

export function artDirectionById(id: ArtDirectionId | string | undefined): ArtDirection {
  return ART_DIRECTIONS.find((d) => d.id === id) ?? ART_DIRECTIONS[0];
}
