import type { ConceptVariationKey } from "./types";

export type ArtDirectionId =
  | "psychedelic-festival"
  | "saturday-morning-cartoon"
  | "vintage-television"
  | "collector-memorabilia";

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
];

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
