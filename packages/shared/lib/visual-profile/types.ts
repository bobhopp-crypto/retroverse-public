/** Visual Profile — separates image selection from image generation. */

export type VisualProfileStatus = "missing" | "legacy" | "complete" | "needs_review";

export type VisualHeroSlot = {
  url: string | null;
};

export type VisualProfile = {
  primaryHero: VisualHeroSlot;
  secondaryHero: VisualHeroSlot;
  tertiaryHero: VisualHeroSlot;
  status: VisualProfileStatus;
};

export type HeroTier = "primary" | "secondary" | "tertiary" | "fallback";

export type ResolvedHero = {
  url: string | null;
  tier: HeroTier | null;
};
