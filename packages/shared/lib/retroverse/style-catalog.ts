/**
 * Client-safe Retroverse style catalog.
 *
 * The labels and era boundaries mirror `data/rvbr/eras-canon.json`. Palette
 * tokens are a snapshot of the existing RVBR renderer output so BobOS
 * creative applications can consume the same visual identities without
 * importing the server-only canon loader. Replace this adapter with the
 * centralized catalog service when that service becomes available.
 */

export type RetroverseStyleId = `RVBR${number}`;

export type RetroverseStyleDefinition = {
  id: RetroverseStyleId;
  displayName: string;
  /** Friendly creative-app label. The official RVBR id remains the stored value. */
  paletteName: string;
  years: string;
  startYear: number;
  endYear: number;
  /** Existing internal era profile identifier retained for catalog migration. */
  sourceProfileId: string;
  identity: {
    primaryPalette: readonly [string, string];
    secondaryPalette: readonly [string, string, string];
    accentColors: readonly [string, string];
    surface: string;
    ink: string;
    tonalBalance: "warm" | "balanced" | "cool";
    contrastBehavior: "soft" | "balanced" | "bold";
    heroGradient: string;
  };
};

type CatalogSeed = {
  year: number;
  endYear: number;
  name: string;
  paletteName: string;
  primary: string;
  secondary: string;
  dark: string;
  paper: string;
  surface: string;
  accentSoft: string;
  tonalBalance: RetroverseStyleDefinition["identity"]["tonalBalance"];
  contrastBehavior: RetroverseStyleDefinition["identity"]["contrastBehavior"];
  heroGradient: string;
};

function style(seed: CatalogSeed): RetroverseStyleDefinition {
  return {
    id: `RVBR${seed.year}`,
    displayName: seed.name,
    paletteName: seed.paletteName,
    years: `${seed.year}\u2013${seed.endYear}`,
    startYear: seed.year,
    endYear: seed.endYear,
    sourceProfileId: `RVER00${seed.year}`,
    identity: {
      primaryPalette: [seed.primary, seed.secondary],
      secondaryPalette: [seed.dark, seed.paper, seed.surface],
      accentColors: [seed.primary, seed.accentSoft],
      surface: seed.surface,
      ink: seed.dark,
      tonalBalance: seed.tonalBalance,
      contrastBehavior: seed.contrastBehavior,
      heroGradient: seed.heroGradient,
    },
  };
}

export const RETROVERSE_STYLE_CATALOG: readonly RetroverseStyleDefinition[] = [
  style({
    year: 1958, endYear: 1961, name: "Teen Pop Establishment", paletteName: "Midnight Ballroom",
    primary: "#9a7a61", secondary: "#2d4a6e", dark: "#1a2744",
    paper: "#f5e6c8", surface: "#F8EDD7", accentSoft: "#C1AA93",
    tonalBalance: "warm", contrastBehavior: "balanced",
    heroGradient: "linear-gradient(145deg, #1a2744 0%, #2d4a6e 50%, #c9a227 100%)",
  }),
  style({
    year: 1962, endYear: 1965, name: "British Invasion and Soul", paletteName: "Soul Gold",
    primary: "#8b7859", secondary: "#8b6914", dark: "#2d2d2d",
    paper: "#f5e6c8", surface: "#F8EDD7", accentSoft: "#B9A98E",
    tonalBalance: "warm", contrastBehavior: "balanced",
    heroGradient: "linear-gradient(145deg, #d4a574 0%, #f5e6c8 50%, #b8860b 100%)",
  }),
  style({
    year: 1966, endYear: 1969, name: "Psychedelic and Soul Expansion", paletteName: "Summer Psychedelia",
    primary: "#7b8a73", secondary: "#e85d2a", dark: "#2d1b4e",
    paper: "#f5e6c8", surface: "#F8EDD7", accentSoft: "#B0B49D",
    tonalBalance: "warm", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #e85d2a 0%, #f4c430 40%, #2d1b4e 100%)",
  }),
  style({
    year: 1970, endYear: 1973, name: "Album Rock and Early Fragmentation", paletteName: "Plum & Tangerine",
    primary: "#7f6c82", secondary: "#e85d2a", dark: "#2d1b4e",
    paper: "#f5e6c8", surface: "#F8EDD7", accentSoft: "#B2A2A6",
    tonalBalance: "warm", contrastBehavior: "balanced",
    heroGradient: "linear-gradient(145deg, #e85d2a 0%, #f4c430 40%, #2d1b4e 100%)",
  }),
  style({
    year: 1974, endYear: 1977, name: "Disco, Punk, and Soft Rock", paletteName: "Disco Noir",
    primary: "#a07b62", secondary: "#e85d2a", dark: "#1a1a1a",
    paper: "#f0ead6", surface: "#F4F0E1", accentSoft: "#C3AC97",
    tonalBalance: "warm", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #1a1a1a 0%, #c41e3a 50%, #f4c430 100%)",
  }),
  style({
    year: 1978, endYear: 1981, name: "New Wave and Format Splintering", paletteName: "New Wave Navy",
    primary: "#6f8792", secondary: "#2d4a6e", dark: "#1a2744",
    paper: "#f5e6c8", surface: "#F8EDD7", accentSoft: "#A9B2AF",
    tonalBalance: "cool", contrastBehavior: "balanced",
    heroGradient: "linear-gradient(145deg, #1a2744 0%, #2d4a6e 50%, #c9a227 100%)",
  }),
  style({
    year: 1982, endYear: 1985, name: "MTV Pop Dominance", paletteName: "Neon After Dark",
    primary: "#8b6f59", secondary: "#ff2d6a", dark: "#0d0d0d",
    paper: "#f5f0e8", surface: "#F8F4EE", accentSoft: "#B9A798",
    tonalBalance: "cool", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #0d0d0d 0%, #ff2d6a 45%, #00e5ff 100%)",
  }),
  style({
    year: 1986, endYear: 1989, name: "Hip-Hop and Hair Metal", paletteName: "Arena Red",
    primary: "#7f6a59", secondary: "#c41e3a", dark: "#1a1a1a",
    paper: "#f5f0e8", surface: "#F8F4EE", accentSoft: "#B2A498",
    tonalBalance: "balanced", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #1a1a1a 0%, #c41e3a 50%, #f4c430 100%)",
  }),
  style({
    year: 1990, endYear: 1993, name: "Grunge and Hip-Hop Takeover", paletteName: "Grunge Ember",
    primary: "#6a7b68", secondary: "#e85d2a", dark: "#1a1a1a",
    paper: "#f0ead6", surface: "#F4F0E1", accentSoft: "#A4AC9B",
    tonalBalance: "balanced", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #1a1a1a 0%, #c41e3a 50%, #f4c430 100%)",
  }),
  style({
    year: 1994, endYear: 1997, name: "Hip-Hop Dominance and Pop Resurgence", paletteName: "Pop Revival",
    primary: "#8a7282", secondary: "#e85d2a", dark: "#1a1a1a",
    paper: "#f0ead6", surface: "#F4F0E1", accentSoft: "#B7A7AA",
    tonalBalance: "balanced", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #1a1a1a 0%, #c41e3a 50%, #f4c430 100%)",
  }),
  style({
    year: 1998, endYear: 2001, name: "Teen Pop and Nu-Metal", paletteName: "Chrome Gold",
    primary: "#7a7f8f", secondary: "#8b6914", dark: "#2d2d2d",
    paper: "#f5e6c8", surface: "#F8EDD7", accentSoft: "#AFADAD",
    tonalBalance: "balanced", contrastBehavior: "balanced",
    heroGradient: "linear-gradient(145deg, #d4a574 0%, #f5e6c8 50%, #b8860b 100%)",
  }),
  style({
    year: 2002, endYear: 2005, name: "Post-9/11 and Ringtone Era", paletteName: "Signal Red",
    primary: "#8a7a68", secondary: "#c41e3a", dark: "#1a1a1a",
    paper: "#f5f0e8", surface: "#F8F4EE", accentSoft: "#B8ADA0",
    tonalBalance: "balanced", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #1a1a1a 0%, #c41e3a 50%, #f4c430 100%)",
  }),
  style({
    year: 2006, endYear: 2009, name: "Digital Transition and Indie Breakthrough", paletteName: "Digital Neon",
    primary: "#6b7f7a", secondary: "#ff2d6a", dark: "#0d0d0d",
    paper: "#f5f0e8", surface: "#F8F4EE", accentSoft: "#A6B0AB",
    tonalBalance: "cool", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #0d0d0d 0%, #ff2d6a 45%, #00e5ff 100%)",
  }),
  style({
    year: 2010, endYear: 2013, name: "EDM and Streaming Emergence", paletteName: "Festival Crimson",
    primary: "#7e7692", secondary: "#c41e3a", dark: "#1a1a1a",
    paper: "#f5f0e8", surface: "#F8F4EE", accentSoft: "#B1ABB9",
    tonalBalance: "cool", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #1a1a1a 0%, #c41e3a 50%, #f4c430 100%)",
  }),
  style({
    year: 2014, endYear: 2017, name: "Streaming Dominance and Genre Blurring", paletteName: "Indie Olive",
    primary: "#78836a", secondary: "#8b6914", dark: "#2d2d2d",
    paper: "#f5e6c8", surface: "#F8EDD7", accentSoft: "#AEB098",
    tonalBalance: "warm", contrastBehavior: "balanced",
    heroGradient: "linear-gradient(145deg, #d4a574 0%, #f5e6c8 50%, #b8860b 100%)",
  }),
  style({
    year: 2018, endYear: 2021, name: "TikTok and Algorithm Era", paletteName: "Algorithm Violet",
    primary: "#7a6d88", secondary: "#c41e3a", dark: "#1a1a1a",
    paper: "#f5f0e8", surface: "#F8F4EE", accentSoft: "#AFA6B3",
    tonalBalance: "cool", contrastBehavior: "bold",
    heroGradient: "linear-gradient(145deg, #1a1a1a 0%, #c41e3a 50%, #f4c430 100%)",
  }),
  style({
    year: 2022, endYear: 2025, name: "Fragmentation and Catalog Revival", paletteName: "Catalog Blue",
    primary: "#6e7c8f", secondary: "#8b6914", dark: "#2d2d2d",
    paper: "#f5e6c8", surface: "#F8EDD7", accentSoft: "#A8ABAD",
    tonalBalance: "cool", contrastBehavior: "balanced",
    heroGradient: "linear-gradient(145deg, #d4a574 0%, #f5e6c8 50%, #b8860b 100%)",
  }),
] as const;

export const DEFAULT_RETROVERSE_STYLE_ID: RetroverseStyleId = "RVBR1958";

const STYLE_BY_ID = new Map<RetroverseStyleId, RetroverseStyleDefinition>(
  RETROVERSE_STYLE_CATALOG.map((definition) => [definition.id, definition]),
);

export function isRetroverseStyleId(value: unknown): value is RetroverseStyleId {
  return typeof value === "string" && STYLE_BY_ID.has(value as RetroverseStyleId);
}

export function retroverseStyleById(id: RetroverseStyleId): RetroverseStyleDefinition {
  return STYLE_BY_ID.get(id) ?? STYLE_BY_ID.get(DEFAULT_RETROVERSE_STYLE_ID)!;
}

export function retroverseStyleLabel(style: RetroverseStyleDefinition): string {
  return `${style.id} \u00b7 ${style.displayName}`;
}

export function retroversePaletteLabel(style: RetroverseStyleDefinition): string {
  return style.paletteName;
}
