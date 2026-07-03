import type { Bp2OvernightPresetId } from "@/lib/ops/browser-plus-2/studio-filters";
import { OVERNIGHT_PRESETS, rowsForOvernightPreset } from "@/lib/ops/browser-plus-2/studio-filters";
import type { Bp2Row } from "@/lib/ops/browser-plus-2/types";

export function estimateOvernightRuntime(preset: Bp2OvernightPresetId, rows: Bp2Row[]): {
  songCount: number;
  estimatedMinutes: number;
  label: string;
} {
  const presetDef = OVERNIGHT_PRESETS.find((p) => p.id === preset);
  const matched = rowsForOvernightPreset(rows, preset);
  const songCount =
    preset === "entire-library" || preset === "top-500-cohort"
      ? matched.length
      : Math.min(matched.length, 100);
  const estimatedMinutes = songCount * (presetDef?.minutesPerSong ?? 3);
  return {
    songCount,
    estimatedMinutes,
    label: presetDef?.label ?? preset,
  };
}

export function formatEstimatedRuntime(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `~${hours}h ${rem}m` : `~${hours}h`;
}
