/** Collector — visual identity profile (performance imagery analysis). */

export const VISUAL_IDENTITY_VERSION = 1 as const;

export type VisualLightingStyle =
  | "concert_blue"
  | "neon"
  | "warm_stage"
  | "studio_clean"
  | "monochrome"
  | "sunset"
  | "psychedelic"
  | "television";

export type VisualBrightness = "dark" | "medium" | "bright";
export type VisualContrast = "low" | "medium" | "high";

/** Normalized profile for Renderer consumption (future sprint). */
export type VisualIdentityProfile = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  palette: string[];
  mood: string;
  lighting: VisualLightingStyle;
  energy: string;
  texture: string;
  typography: string;
  brightness: VisualBrightness;
  contrast: VisualContrast;
  atmosphere: string;
  cameraEnergy: string;
  emotionalTone: string;
  confidence: number;
};

export type PerformanceVisualIdentity = {
  performanceId: string;
  title: string;
  sourceImages: string[];
  skipped: boolean;
  skipReason: string | null;
  profile: VisualIdentityProfile | null;
};

export type CollectorVisualIdentityPackage = {
  version: typeof VISUAL_IDENTITY_VERSION;
  rvtr: string;
  artist: string;
  title: string;
  generatedAt: string;
  primaryPerformanceId: string | null;
  /** Primary performance profile — convenience mirror for downstream consumers. */
  profile: VisualIdentityProfile | null;
  performances: PerformanceVisualIdentity[];
};
