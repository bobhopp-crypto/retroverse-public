import type { VisualWorldId } from "./visual-worlds";
import { VISUAL_WORLDS } from "./visual-worlds";
import type { ConceptVariationKey } from "./types";

/** Legacy ids kept for illustration asset categories and old presets. */
export type LegacyArtDirectionId = "saturday-morning-cartoon" | "retro-disney-adventure";

export type ArtDirectionId = VisualWorldId | LegacyArtDirectionId;

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
    id: "music-television-credential",
    key: "B",
    title: "Music Television Credential",
    subtitle: "MTV backstage · VH1 · concert laminates",
    styleChips: ["MTV Era", "Bold Type", "Neon Graphics", "Laminate Pass"],
    collectibility: "Very High",
    whyThisWorks: "Authentic music-TV credential — wallet-worthy memorabilia, not cartoon culture.",
    palette: ["#0d0d0d", "#ff2d6a", "#00e5ff", "#f4c430", "#f5f0e8"],
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
    id: "concert-backstage-laminate",
    key: "B",
    title: "Concert Backstage Laminate",
    subtitle: "Tour passes · stage-door · road-case credentials",
    styleChips: ["Tour Laminate", "Stage Door", "Security Zones", "All Access"],
    collectibility: "High",
    whyThisWorks: "Road-tour laminate authority — the pass you keep from a legendary night.",
    palette: ["#1a1a1a", "#c41e3a", "#f4c430", "#f5f0e8", "#2d4a6e"],
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
  B: "music-television-credential",
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
