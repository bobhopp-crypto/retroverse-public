import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";

import type { VisualProfile, VisualProfileStatus } from "./types";

function deriveStatus(
  pkg: SongPackage,
  primaryUrl: string | null,
  secondaryUrl: string | null,
): VisualProfileStatus {
  const override = pkg.storedVisualProfile?.statusOverride;
  if (override) return override;
  if (pkg.issueFlags?.includes("wrong_cover")) return "needs_review";
  if (primaryUrl) return "complete";
  if (secondaryUrl) return "legacy";
  return "missing";
}

/** Build a Visual Profile from normalized song package metadata. */
export function buildVisualProfileFromPackage(pkg: SongPackage): VisualProfile {
  const stored = pkg.storedVisualProfile;
  const secondaryUrl = pkg.metadata.coverUrl?.trim() || null;
  const primaryUrl = stored?.primaryHeroUrl?.trim() || null;
  const tertiaryUrl = stored?.tertiaryHeroUrl?.trim() || null;

  return {
    primaryHero: { url: primaryUrl },
    secondaryHero: { url: secondaryUrl },
    tertiaryHero: { url: tertiaryUrl },
    status: deriveStatus(pkg, primaryUrl, secondaryUrl),
  };
}

export function emptyVisualProfile(): VisualProfile {
  return {
    primaryHero: { url: null },
    secondaryHero: { url: null },
    tertiaryHero: { url: null },
    status: "missing",
  };
}

/** Secondary-only profile when no song package exists. */
export function buildVisualProfileFromCoverUrl(
  coverUrl: string | null,
): VisualProfile {
  const secondaryUrl = coverUrl?.trim() || null;
  return {
    primaryHero: { url: null },
    secondaryHero: { url: secondaryUrl },
    tertiaryHero: { url: null },
    status: secondaryUrl ? "legacy" : "missing",
  };
}
