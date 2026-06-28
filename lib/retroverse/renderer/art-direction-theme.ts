import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";

/** Renderer 0.1 neutral theme — used when Song DNA or Art Direction is unavailable. */
export const NEUTRAL_EXPERIENCE_THEME: Record<string, string> = {
  "--rv-exp-bg": "#111114",
  "--rv-exp-surface": "#1a1a1f",
  "--rv-exp-text": "#f4f2ed",
  "--rv-exp-muted": "#a8a5a0",
  "--rv-exp-accent": "#3dbfb0",
  "--rv-exp-warn": "#e07a4a",
  "--rv-exp-font": 'system-ui, -apple-system, "Segoe UI", sans-serif',
  "--rv-exp-space-scale": "1",
  "--rv-exp-energy": "1",
};

export function mapArtDirectionToExperienceTheme(
  profile: ArtDirectionProfile,
): Record<string, string> {
  const { swatches } = profile.colorSystem;
  const tv = profile.themeVars;

  return {
    "--rv-exp-bg": swatches.background,
    "--rv-exp-surface": swatches.surface,
    "--rv-exp-text": tv["--elab-text"] ?? NEUTRAL_EXPERIENCE_THEME["--rv-exp-text"]!,
    "--rv-exp-muted": tv["--elab-text-muted"] ?? NEUTRAL_EXPERIENCE_THEME["--rv-exp-muted"]!,
    "--rv-exp-accent": swatches.accent,
    "--rv-exp-warn": swatches.highlight,
    "--rv-exp-font": profile.typography.fontStack,
    "--rv-exp-space-scale": tv["--elab-space-scale"] ?? "1",
    "--rv-exp-energy": tv["--elab-energy"] ?? "1",
    "--rv-exp-image-dominance": imageDominanceScale(profile.composition.imageDominance.value),
    "--rv-exp-typo-weight": profile.typography.weight.value,
  };
}

function imageDominanceScale(value: string): string {
  if (value === "dominant") return "1.12";
  if (value === "balanced") return "1";
  return "0.92";
}

export function typographyClass(profile: ArtDirectionProfile | null): string {
  if (!profile) return "rv-exp--typo-neutral";
  const c = profile.typography.characteristic.value;
  return `rv-exp--typo-${c.replace(/[^a-z0-9]+/g, "-")}`;
}
