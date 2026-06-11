import {
  DEFAULT_CREATIVE_DIRECTION_SETTINGS,
  type CreativeDirectionSettings,
} from "@/lib/ops/content-creator/creative-direction";

/** Content Creator — Sunday Nights pass defaults. */
export const CONTENT_CREATOR_DEFAULTS = {
  event: "Sunday Nights",
  venue: "The Main Pub",
  date: "June 14, 2026",
  featuredYears: [1967, 1978, 1992],
  passTypeLabel: "VIP PASS" as const,
  qrUrl: "https://retroverse.live",
  quantity: 200,
  creativeDirection: DEFAULT_CREATIVE_DIRECTION_SETTINGS.creativeDirection,
  avoidEraTropes: DEFAULT_CREATIVE_DIRECTION_SETTINGS.avoidEraTropes,
  maximizeVariation: DEFAULT_CREATIVE_DIRECTION_SETTINGS.maximizeVariation,
} satisfies {
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  passTypeLabel: "VIP PASS";
  qrUrl: string;
  quantity: number;
} & CreativeDirectionSettings;
