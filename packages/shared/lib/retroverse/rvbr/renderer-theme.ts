/**
 * RVBR → Universal Renderer presentation tokens.
 *
 * Maps era canon + visual worlds + credential typography into CSS custom
 * properties. The renderer applies these vars; it never hardcodes era colors.
 */

import { BUILTIN_PRESET_LIBRARY } from "@/lib/ops/creative-lab/preset-library";
import { credentialTypographyForWorld } from "@/lib/ops/creative-lab/pass-credential-typography";
import {
  visualWorldById,
  type VisualWorld,
  type VisualWorldId,
} from "@/lib/ops/creative-lab/visual-worlds";
import { rvbrEraVisualDnaForProfile } from "@/lib/ops/content-creator/rvbr-era-visual-dna";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";
import { hexToRgb, luminance, mix } from "@/lib/retroverse/art-direction/color-utils";

import { resolveRvbrProfileForYear } from "./canon-profiles";
import { RVBR_RENDERER_DEFAULT_VARS } from "./renderer-theme-defaults";

export { RVBR_RENDERER_DEFAULT_VARS };

export type RvbrRendererTheme = {
  eraSlug: string | null;
  eraName: string | null;
  eraYears: string | null;
  visualWorldId: VisualWorldId;
  cssVars: Record<string, string>;
};

type DensityTokens = {
  borderWidth: string;
  cardRadius: string;
  statRadius: string;
  buttonRadius: string;
  spacingScale: string;
  shadowOffset: string;
  pulseDuration: string;
};

const DEFAULT_DENSITY: DensityTokens = {
  borderWidth: "3px",
  cardRadius: "16px",
  statRadius: "12px",
  buttonRadius: "999px",
  spacingScale: "1",
  shadowOffset: "4px",
  pulseDuration: "1.6s",
};

const DENSITY_BY_STYLE: Record<string, DensityTokens> = {
  simple: {
    borderWidth: "2px",
    cardRadius: "20px",
    statRadius: "16px",
    buttonRadius: "999px",
    spacingScale: "1.12",
    shadowOffset: "3px",
    pulseDuration: "1.8s",
  },
  medium: DEFAULT_DENSITY,
  detailed: {
    borderWidth: "3px",
    cardRadius: "12px",
    statRadius: "10px",
    buttonRadius: "999px",
    spacingScale: "0.94",
    shadowOffset: "5px",
    pulseDuration: "1.4s",
  },
};

function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function rgbComponents(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0,0,0";
  return `${rgb.r},${rgb.g},${rgb.b}`;
}

function pickLightest(colors: string[], fallback: string): string {
  let best = fallback;
  let bestL = luminance(fallback);
  for (const hex of colors) {
    const l = luminance(hex);
    if (l > bestL) {
      best = hex;
      bestL = l;
    }
  }
  return best;
}

function pickSecondary(colors: string[], ink: string, accent: string): string {
  const candidates = colors.filter((hex) => {
    const l = luminance(hex);
    return l > 0.12 && l < 0.62 && hex.toLowerCase() !== ink.toLowerCase();
  });
  return candidates[0] ?? colors[Math.min(3, Math.max(0, colors.length - 1))] ?? accent;
}

function resolveDensityTokens(profile: RvbrProfile | null): DensityTokens {
  for (const presetId of profile?.promptFragments.creativeLabPresets ?? []) {
    const preset = BUILTIN_PRESET_LIBRARY.find((row) => row.id === presetId);
    if (preset?.densityStyle && DENSITY_BY_STYLE[preset.densityStyle]) {
      return DENSITY_BY_STYLE[preset.densityStyle]!;
    }
  }
  return DEFAULT_DENSITY;
}

function buildThemeVars(profile: RvbrProfile, world: VisualWorld, worldId: VisualWorldId): Record<string, string> {
  const typography = credentialTypographyForWorld(worldId);
  const dna = rvbrEraVisualDnaForProfile(profile);
  const palette = [
    ...new Set(
      [...dna.palette, ...world.palette, profile.visualIdentity.accent].filter(
        (hex): hex is string => typeof hex === "string" && hex.length > 0,
      ),
    ),
  ];

  const accent = profile.visualIdentity.accent ?? typography.accent ?? palette[0] ?? RVBR_RENDERER_DEFAULT_VARS["--urx-orange"]!;
  const ink = typography.ink;
  const cream = pickLightest(palette, typography.highlight);
  const paper = mix(cream, "#FFFFFF", 0.28);
  const secondary = pickSecondary(palette, ink, accent);
  const teal = pickSecondary(world.palette, ink, secondary);
  const red =
    palette.find((hex) => hex.toLowerCase() !== accent.toLowerCase() && luminance(hex) < 0.45) ??
    accent;
  const accentSoft = mix(accent, paper, 0.42);
  const density = resolveDensityTokens(profile);

  return {
    "--urx-cream": cream,
    "--urx-paper": paper,
    "--urx-ink": ink,
    "--urx-teal": teal,
    "--urx-orange": accent,
    "--urx-red": red,
    "--urx-accent-soft": accentSoft,
    "--urx-border-width": density.borderWidth,
    "--urx-border": `${density.borderWidth} solid ${ink}`,
    "--urx-bg-gradient": `linear-gradient(180deg, ${cream} 0%, ${mix(cream, secondary, 0.14)} 100%)`,
    "--urx-hero-placeholder": world.heroGradient,
    "--urx-hero-wash": `linear-gradient(160deg, ${rgbaFromHex(accent, 0.5)}, ${rgbaFromHex(secondary, 0.65)})`,
    "--urx-hero-scrim": `linear-gradient(180deg, ${rgbaFromHex(ink, 0.35)} 0%, ${rgbaFromHex(ink, 0.25)} 40%, ${rgbaFromHex(ink, 0.93)} 100%)`,
    "--urx-font-headline": typography.zones.EVENT_NAME.fontFamily,
    "--urx-font-body": typography.zones.DATE.fontFamily,
    "--urx-card-radius": density.cardRadius,
    "--urx-stat-radius": density.statRadius,
    "--urx-button-radius": density.buttonRadius,
    "--urx-spacing-scale": density.spacingScale,
    "--urx-shadow-offset": density.shadowOffset,
    "--urx-shadow-color": rgbaFromHex(ink, 0.12),
    "--urx-divider-color": accent,
    "--urx-pulse-duration": density.pulseDuration,
    "--urx-paper-rgb": rgbComponents(paper),
    "--urx-ink-rgb": rgbComponents(ink),
  };
}

export function resolveRvbrRendererTheme(year: number | null | undefined): RvbrRendererTheme {
  const profile = resolveRvbrProfileForYear(year);
  if (!profile) {
    return {
      eraSlug: null,
      eraName: null,
      eraYears: null,
      visualWorldId: "vintage-television",
      cssVars: { ...RVBR_RENDERER_DEFAULT_VARS },
    };
  }

  const worldId = resolveVisualWorldFromRvbr(profile);
  const world = visualWorldById(worldId);

  return {
    eraSlug: profile.slug,
    eraName: profile.name,
    eraYears: `${profile.eraStartYear}–${profile.eraEndYear}`,
    visualWorldId: worldId,
    cssVars: buildThemeVars(profile, world, worldId),
  };
}
