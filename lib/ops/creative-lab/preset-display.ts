import type { CreativeLabPresetFile } from "./types";

/** Client-safe preset summary — no filesystem imports. */
export function presetStyleSummaryLabel(preset: CreativeLabPresetFile): string {
  const parts = [
    preset.credentialStyle,
    preset.illustrationStyle,
    preset.colorStyle,
    preset.densityStyle,
  ].filter(Boolean);
  return parts.join(" · ");
}
