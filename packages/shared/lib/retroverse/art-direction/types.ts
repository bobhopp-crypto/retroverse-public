import type { LabLayoutId } from "@/lib/retroverse/experience-lab/types";

/** Traceable design decision derived from Song DNA (+ layout / render spec context). */
export type ArtDirectionChoice<T extends string = string> = {
  value: T;
  label: string;
  reason: string;
  /** Song DNA field paths that informed this choice. */
  dnaSources: string[];
};

export type ArtDirectionColorSwatches = {
  background: string;
  surface: string;
  accent: string;
  highlight: string;
  palettePrimary: string;
  paletteSecondary: string;
};

export type ArtDirectionColorSystem = {
  background: ArtDirectionChoice;
  surface: ArtDirectionChoice;
  accent: ArtDirectionChoice;
  highlight: ArtDirectionChoice;
  contrastStrategy: ArtDirectionChoice;
  swatches: ArtDirectionColorSwatches;
};

export type ArtDirectionTypography = {
  characteristic: ArtDirectionChoice;
  fontStack: string;
  weight: ArtDirectionChoice;
  tracking: ArtDirectionChoice;
};

export type ArtDirectionComposition = {
  imageDominance: ArtDirectionChoice;
  textDensity: ArtDirectionChoice;
  whiteSpace: ArtDirectionChoice;
  cardTreatment: ArtDirectionChoice;
  framingStyle: ArtDirectionChoice;
};

export type ArtDirectionMotionProfile = {
  profile: ArtDirectionChoice;
  sceneRhythm: ArtDirectionChoice;
};

export type ArtDirectionDnaSummary = {
  overallMood: string;
  visualEnergy: string;
  readingPace: string;
  primaryTheme: string;
  lightingStyle: string | null;
  recommendedColorFamily: string;
  recommendedMotionStyle: string;
};

/** Runtime-only creative direction — not a package artifact. */
export type ArtDirectionProfile = {
  rvtr: string;
  layoutId: LabLayoutId;
  generatedAt: string;
  colorSystem: ArtDirectionColorSystem;
  typography: ArtDirectionTypography;
  composition: ArtDirectionComposition;
  motion: ArtDirectionMotionProfile;
  visualMotifs: ArtDirectionChoice[];
  dnaSummary: ArtDirectionDnaSummary;
  /** CSS custom properties for Experience Lab panes. */
  themeVars: Record<string, string>;
};
