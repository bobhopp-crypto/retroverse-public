import type { ProductionLayout } from "./production-layout";

/** Named production layout presets — editable configuration, not hardcoded in UI. */
export type ProductionLayoutPreset = {
  id: string;
  label: string;
  layout: ProductionLayout;
};

export const PRODUCTION_LAYOUT_PRESETS: ProductionLayoutPreset[] = [
  {
    id: "festival-pass",
    label: "Festival Pass",
    layout: {
      version: 1,
      qr: {
        x: 0.5,
        y: 0.47,
        size: 0.78,
        padding: 0.02,
        whiteBackgroundOpacity: 1,
      },
      serial: {
        x: 0.5,
        y: 0.91,
        width: 0.9,
        height: 0.15,
        fontSize: 30,
        rotation: 0,
        inkOpacity: 0.92,
      },
      safeArea: { enabled: true, margin: 0.04 },
    },
  },
  {
    id: "collector-card",
    label: "Collector Card",
    layout: {
      version: 1,
      qr: {
        x: 0.42,
        y: 0.51,
        size: 0.3,
        padding: 0.02,
        whiteBackgroundOpacity: 1,
      },
      serial: {
        x: 0.5,
        y: 0.91,
        width: 0.42,
        height: 0.08,
        fontSize: 26,
        rotation: -2,
        inkOpacity: 0.9,
      },
      safeArea: { enabled: true, margin: 0.05 },
    },
  },
  {
    id: "backstage-credential",
    label: "Backstage Credential",
    layout: {
      version: 1,
      qr: {
        x: 0.5,
        y: 0.55,
        size: 0.35,
        padding: 0.015,
        whiteBackgroundOpacity: 0.98,
      },
      serial: {
        x: 0.5,
        y: 0.92,
        width: 0.55,
        height: 0.07,
        fontSize: 24,
        rotation: 1.5,
        inkOpacity: 0.88,
      },
      safeArea: { enabled: true, margin: 0.06 },
    },
  },
];

export function productionLayoutPresetById(id: string): ProductionLayoutPreset | undefined {
  return PRODUCTION_LAYOUT_PRESETS.find((preset) => preset.id === id);
}
