/** Featured presets on the creative workstation landing — no new data, display filter only. */
export const WORKSTATION_FEATURED_PRESET_IDS = [
  "sunday-nights-classic",
  "collector-edition",
  "live-aid",
  "woodstock",
  "retro-tv-broadcast",
  "music-bingo",
] as const;

export type WorkstationOutputId = "pass" | "poster" | "bumper" | "card" | "magazine";

export const WORKSTATION_OUTPUTS: Array<{
  id: WorkstationOutputId;
  label: string;
  module: "pass-lab" | "poster-lab" | "bumper-lab" | "card-lab" | "magazine-lab";
  available: boolean;
  advanced?: boolean;
}> = [
  { id: "pass", label: "PASS", module: "pass-lab", available: true },
  { id: "poster", label: "POSTER", module: "poster-lab", available: false },
  { id: "bumper", label: "BUMPER", module: "bumper-lab", available: false },
  { id: "card", label: "CARD", module: "card-lab", available: false, advanced: true },
  { id: "magazine", label: "MAGAZINE", module: "magazine-lab", available: false, advanced: true },
];
