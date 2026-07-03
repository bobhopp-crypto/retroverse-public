import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";

import {
  buildVisualProfileFromPackage,
  emptyVisualProfile,
} from "./build-visual-profile";
import type { ResolvedHero, VisualProfile } from "./types";

function pickUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Select the best hero image from a Visual Profile. */
export function resolveBestHero(
  profile: VisualProfile,
  retroverseFallback?: string | null,
): ResolvedHero {
  const primary = pickUrl(profile.primaryHero.url);
  if (primary) return { url: primary, tier: "primary" };

  const secondary = pickUrl(profile.secondaryHero.url);
  if (secondary) return { url: secondary, tier: "secondary" };

  const tertiary = pickUrl(profile.tertiaryHero.url);
  if (tertiary) return { url: tertiary, tier: "tertiary" };

  const fallback = pickUrl(retroverseFallback);
  if (fallback) return { url: fallback, tier: "fallback" };

  return { url: null, tier: null };
}

/** Resolve hero from a hydrated song package, with optional Retroverse fallback. */
export function resolveHeroFromSongPackage(
  pkg: SongPackage | null | undefined,
  retroverseFallback?: string | null,
): ResolvedHero {
  if (!pkg) return resolveBestHero(emptyVisualProfile(), retroverseFallback);

  const profile = pkg.visualProfile ?? buildVisualProfileFromPackage(pkg);
  return resolveBestHero(profile, retroverseFallback);
}
