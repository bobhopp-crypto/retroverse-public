/**
 * Sprint 3.36 — Era-aware styling rules for Art Director.
 */

export type EraProfile = {
  year: number;
  decade: string;
  typography: string[];
  printStyle: string;
  photography: string;
  materials: string[];
  graphicTrends: string[];
  defaultPalette: string[];
  motionVocabulary: string[];
  authenticityNote: string;
};

function decadeLabel(year: number): string {
  const d = Math.floor(year / 10) * 10;
  return `${d}s`;
}

const DECADE_PROFILES: Record<string, Omit<EraProfile, "year" | "decade">> = {
  "1970s": {
    typography: ["Cooper Black headlines", "Helvetica body", "Hand-lettered album titles"],
    printStyle: "Offset lithography — warm ink on cream stock",
    photography: "Soft film grain, tungsten warmth, slightly faded color",
    materials: ["Vinyl", "Cassette tape", "Newsprint", "Gloss album sleeve"],
    graphicTrends: ["Earth tones", "Rounded typography", "Album-centric layouts", "Billboard chart graphics"],
    defaultPalette: ["Amber", "Brown", "Cream", "Avocado", "Rust"],
    motionVocabulary: ["Ken Burns drift", "Slow cross dissolve", "Record spin", "Gentle push-in"],
    authenticityNote: "Late-70s pop — Muscle Shoals warmth, AM radio era, pre-MTV",
  },
  "1980s": {
    typography: ["Helvetica Neue", "Bold sans-serif", "Neon accent type"],
    printStyle: "Gloss magazine — high contrast, bold color blocks",
    photography: "Sharper stock, concert flash, MTV-era performance stills",
    materials: ["CD jewel case", "VHS label", "Gloss magazine", "Neon signage"],
    graphicTrends: ["Bold geometry", "Neon accents", "Video-era performance framing"],
    defaultPalette: ["Black", "White", "Red", "Teal", "Gold"],
    motionVocabulary: ["Cross dissolve", "Video scan lines", "Quick cut rhythm"],
    authenticityNote: "Early-80s performance footage and chart reissues",
  },
  "1960s": {
    typography: ["Swiss sans-serif", "Psychedelic display (sparingly)", "Editorial serif"],
    printStyle: "Letterpress and offset — high contrast black and white",
    photography: "High-grain black and white, documentary candid",
    materials: ["Newsprint", "45rpm label", "Poster paper"],
    graphicTrends: ["Mod geometry", "High contrast", "Documentary candid frames"],
    defaultPalette: ["Black", "Cream", "Red", "Navy"],
    motionVocabulary: ["Slow pan", "Photo scatter", "Fade from black"],
    authenticityNote: "Pre-digital documentary aesthetic",
  },
};

const DEFAULT_PROFILE: Omit<EraProfile, "year" | "decade"> = {
  typography: ["Editorial serif", "Clean sans-serif"],
  printStyle: "Modern editorial — cream paper, restrained color",
  photography: "Natural light, minimal processing",
  materials: ["Paper", "Digital screen"],
  graphicTrends: ["Minimal editorial", "Data-forward layouts"],
  defaultPalette: ["Cream", "Teal", "Brown", "Muted black"],
  motionVocabulary: ["Fade", "Slow pan", "Parallax"],
  authenticityNote: "Timeless editorial — avoid anachronistic digital gloss",
};

export function resolveEraProfile(year: number | null | undefined): EraProfile {
  const y = year && year > 1900 ? year : 1978;
  const decade = decadeLabel(y);
  const base = DECADE_PROFILES[decade] ?? DEFAULT_PROFILE;
  return { year: y, decade, ...base };
}
