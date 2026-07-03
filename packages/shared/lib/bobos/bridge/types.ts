import type { HeroTier, ResolvedHero, VisualProfile } from "@/lib/visual-profile/types";

export type BridgeSongModel = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  playCount: number | null;
  hasPackage: boolean;
  visualProfile: VisualProfile;
  resolvedHero: ResolvedHero;
  prevRvtr: string | null;
  nextRvtr: string | null;
};

export type BridgeLiveState = {
  rvtr: string | null;
  label: string;
};

export const TIER_LABELS: Record<NonNullable<HeroTier>, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
  fallback: "Retroverse Fallback",
};

export const STATUS_LABELS = {
  missing: "Missing",
  legacy: "Legacy",
  complete: "Complete",
  needs_review: "Needs Review",
} as const;

export type BridgeVisualAction =
  | "promote_secondary"
  | "clear_primary"
  | "mark_needs_review";
