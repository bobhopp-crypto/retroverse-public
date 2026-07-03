import { styleById } from "./style-catalog";
import type { CreativeLabPresetFile } from "./types";
import type { InfluenceId } from "./influences";
import { PRESET_INFLUENCE_MAP } from "./influences";

export type PresetLayoutVariant =
  | "pub-night"
  | "broadcast"
  | "collector"
  | "festival"
  | "stadium"
  | "bingo";

export type PresetVisualMeta = {
  layout: PresetLayoutVariant;
  intendedUse: string;
  palette: string[];
  accentHue: number;
  influenceIds: InfluenceId[];
};

const COLOR_PALETTES: Record<string, string[]> = {
  "cream-vintage": ["#f5e6c8", "#d4a574", "#8b6914", "#2d4a3e"],
  "bright-pop": ["#ff4757", "#ffa502", "#3742fa", "#f5e6c8"],
  "muted-retro": ["#8b8178", "#c4a882", "#5c5346", "#3d5a80"],
  "earth-tone": ["#c17f4a", "#6b8e4e", "#8b4513", "#f0d9b5"],
  monochrome: ["#1a1a1a", "#666666", "#cccccc", "#e8e4d8"],
  neon: ["#ff00aa", "#00e5ff", "#1a1030", "#ffe566"],
};

const PRESET_VISUALS: Record<string, Omit<PresetVisualMeta, "palette"> & { colorStyle: string }> = {
  "sunday-nights-classic": {
    layout: "pub-night",
    intendedUse: "Weekly pub music night",
    accentHue: 42,
    colorStyle: "cream-vintage",
    influenceIds: PRESET_INFLUENCE_MAP["sunday-nights-classic"] ?? [],
  },
  "collector-edition": {
    layout: "collector",
    intendedUse: "Limited keepsake edition",
    accentHue: 8,
    colorStyle: "bright-pop",
    influenceIds: PRESET_INFLUENCE_MAP["collector-edition"] ?? [],
  },
  "live-aid": {
    layout: "stadium",
    intendedUse: "Global stadium broadcast",
    accentHue: 210,
    colorStyle: "muted-retro",
    influenceIds: PRESET_INFLUENCE_MAP["live-aid"] ?? [],
  },
  woodstock: {
    layout: "festival",
    intendedUse: "Outdoor festival field pass",
    accentHue: 95,
    colorStyle: "earth-tone",
    influenceIds: PRESET_INFLUENCE_MAP.woodstock ?? [],
  },
  "retro-tv-broadcast": {
    layout: "broadcast",
    intendedUse: "Studio guest credential",
    accentHue: 195,
    colorStyle: "muted-retro",
    influenceIds: PRESET_INFLUENCE_MAP["retro-tv-broadcast"] ?? [],
  },
  "music-bingo": {
    layout: "bingo",
    intendedUse: "Interactive game night pass",
    accentHue: 280,
    colorStyle: "bright-pop",
    influenceIds: PRESET_INFLUENCE_MAP["music-bingo"] ?? [],
  },
};

export type PresetCardVisual = {
  credentialLabel: string;
  illustrationLabel: string;
  colorLabel: string;
  intendedUse: string;
  layout: PresetLayoutVariant;
  palette: string[];
  accentHue: number;
};

export function presetCardVisual(preset: CreativeLabPresetFile): PresetCardVisual {
  const meta = PRESET_VISUALS[preset.id];
  const colorStyle = meta?.colorStyle ?? preset.colorStyle;
  return {
    credentialLabel: styleById(preset.credentialStyle)?.label ?? preset.credentialStyle,
    illustrationLabel: styleById(preset.illustrationStyle)?.label ?? preset.illustrationStyle,
    colorLabel: styleById(preset.colorStyle)?.label ?? preset.colorStyle,
    intendedUse: meta?.intendedUse ?? preset.description,
    layout: meta?.layout ?? "pub-night",
    palette: COLOR_PALETTES[colorStyle] ?? COLOR_PALETTES["cream-vintage"],
    accentHue: meta?.accentHue ?? 180,
  };
}
