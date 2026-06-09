import type { ConceptStrategyId, ConceptStrategyMap, StyleSelection } from "./types";

export type BuiltinPresetSeed = {
  id: string;
  name: string;
  description: string;
  credentialStyle: string;
  illustrationStyle: string;
  colorStyle: string;
  densityStyle: string;
  defaultConceptStrategy: ConceptStrategyId;
  conceptStrategies: ConceptStrategyMap;
};

export function singleStyleSelection(
  credential: string,
  illustration: string,
  color: string,
  density: string,
): StyleSelection {
  return {
    credential: [{ id: credential, weight: 100 }],
    illustration: [{ id: illustration, weight: 100 }],
    color: [{ id: color, weight: 100 }],
    density: [{ id: density, weight: 100 }],
  };
}

/** Retroverse starter preset library — one-click style + concept strategy. */
export const BUILTIN_PRESET_LIBRARY: BuiltinPresetSeed[] = [
  {
    id: "sunday-nights-classic",
    name: "Sunday Nights Classic",
    description: "Pub-night festival pass with Saturday-morning cartoon warmth and cream vintage stock.",
    credentialStyle: "festival-pass",
    illustrationStyle: "saturday-morning-cartoon",
    colorStyle: "cream-vintage",
    densityStyle: "detailed",
    defaultConceptStrategy: "broadcast-focus",
    conceptStrategies: { A: "broadcast-focus", B: "credential-focus", C: "festival-focus", D: "collector-focus" },
  },
  {
    id: "retro-tv-broadcast",
    name: "Retro TV Broadcast",
    description: "Studio guest credential with mid-century broadcast graphics and muted retro inks.",
    credentialStyle: "tv-studio-credential",
    illustrationStyle: "mid-century",
    colorStyle: "muted-retro",
    densityStyle: "medium",
    defaultConceptStrategy: "broadcast-focus",
    conceptStrategies: { A: "broadcast-focus", B: "credential-focus", C: "collector-focus", D: "festival-focus" },
  },
  {
    id: "collector-edition",
    name: "Collector Edition",
    description: "Trading-card collectible with comic-book dynamism and bright pop candy colors.",
    credentialStyle: "trading-card",
    illustrationStyle: "comic-book",
    colorStyle: "bright-pop",
    densityStyle: "detailed",
    defaultConceptStrategy: "collector-focus",
    conceptStrategies: { A: "collector-focus", B: "credential-focus", C: "broadcast-focus", D: "festival-focus" },
  },
  {
    id: "backstage-credential",
    name: "Backstage Credential",
    description: "High-security backstage laminate with photographic hero and muted retro palette.",
    credentialStyle: "backstage-laminate",
    illustrationStyle: "photographic",
    colorStyle: "muted-retro",
    densityStyle: "medium",
    defaultConceptStrategy: "credential-focus",
    conceptStrategies: { A: "credential-focus", B: "collector-focus", C: "broadcast-focus", D: "festival-focus" },
  },
  {
    id: "festival-credential",
    name: "Festival Credential",
    description: "Multi-day festival pass with rock-poster illustration and earth-tone field palette.",
    credentialStyle: "festival-pass",
    illustrationStyle: "rock-poster",
    colorStyle: "earth-tone",
    densityStyle: "detailed",
    defaultConceptStrategy: "festival-focus",
    conceptStrategies: { A: "festival-focus", B: "credential-focus", C: "collector-focus", D: "broadcast-focus" },
  },
  {
    id: "live-aid",
    name: "Live Aid",
    description: "Backstage laminate with photographic stadium heroes and muted global-broadcast tones.",
    credentialStyle: "backstage-laminate",
    illustrationStyle: "photographic",
    colorStyle: "muted-retro",
    densityStyle: "detailed",
    defaultConceptStrategy: "festival-focus",
    conceptStrategies: { A: "festival-focus", B: "credential-focus", C: "broadcast-focus", D: "collector-focus" },
  },
  {
    id: "woodstock",
    name: "Woodstock",
    description: "Festival pass with psychedelic poster energy and sun-washed earth tones.",
    credentialStyle: "festival-pass",
    illustrationStyle: "psychedelic",
    colorStyle: "earth-tone",
    densityStyle: "detailed",
    defaultConceptStrategy: "festival-focus",
    conceptStrategies: { A: "festival-focus", B: "collector-focus", C: "credential-focus", D: "broadcast-focus" },
  },
  {
    id: "british-invasion",
    name: "British Invasion",
    description: "Press pass with mid-century editorial restraint and monochrome ink discipline.",
    credentialStyle: "press-pass",
    illustrationStyle: "mid-century",
    colorStyle: "monochrome",
    densityStyle: "medium",
    defaultConceptStrategy: "credential-focus",
    conceptStrategies: { A: "credential-focus", B: "broadcast-focus", C: "collector-focus", D: "festival-focus" },
  },
  {
    id: "mtv-era",
    name: "MTV Era",
    description: "Concert credential with pop-art punch and bright neon-adjacent primaries.",
    credentialStyle: "concert-credential",
    illustrationStyle: "pop-art",
    colorStyle: "bright-pop",
    densityStyle: "detailed",
    defaultConceptStrategy: "broadcast-focus",
    conceptStrategies: { A: "broadcast-focus", B: "collector-focus", C: "festival-focus", D: "credential-focus" },
  },
  {
    id: "summer-of-love",
    name: "Summer of Love",
    description: "Festival pass with psychedelic swirl and cream vintage paper warmth.",
    credentialStyle: "festival-pass",
    illustrationStyle: "psychedelic",
    colorStyle: "cream-vintage",
    densityStyle: "detailed",
    defaultConceptStrategy: "festival-focus",
    conceptStrategies: { A: "festival-focus", B: "collector-focus", C: "credential-focus", D: "broadcast-focus" },
  },
  {
    id: "music-bingo",
    name: "Music Bingo",
    description: "Playful trading-card frame with Saturday-morning cartoon and bright pop game-night colors.",
    credentialStyle: "trading-card",
    illustrationStyle: "saturday-morning-cartoon",
    colorStyle: "bright-pop",
    densityStyle: "medium",
    defaultConceptStrategy: "collector-focus",
    conceptStrategies: { A: "collector-focus", B: "festival-focus", C: "broadcast-focus", D: "credential-focus" },
  },
  {
    id: "retroverse-magazine",
    name: "Retroverse Magazine",
    description: "Newsstand magazine cover with comic-book ink and cream vintage editorial stock.",
    credentialStyle: "magazine-cover",
    illustrationStyle: "comic-book",
    colorStyle: "cream-vintage",
    densityStyle: "detailed",
    defaultConceptStrategy: "collector-focus",
    conceptStrategies: { A: "collector-focus", B: "broadcast-focus", C: "credential-focus", D: "festival-focus" },
  },
];

/** Legacy built-in ids replaced by the starter library. */
export const OBSOLETE_BUILTIN_PRESET_IDS = [
  "retroverse-classic",
  "sunday-nights",
];

export function presetStyleSummary(seed: BuiltinPresetSeed): string {
  return `${seed.credentialStyle} · ${seed.illustrationStyle} · ${seed.colorStyle} · ${seed.densityStyle}`;
}
