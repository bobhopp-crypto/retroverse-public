import type { GiveawayStudioSection } from "./types";

export const GIVEAWAY_STUDIO_NAV: Array<{
  id: GiveawayStudioSection;
  label: string;
  href: string;
}> = [
  { id: "overview", label: "Overview", href: "/ops/event-studio/giveaway" },
  { id: "prize", label: "Prize", href: "/ops/event-studio/giveaway/prize" },
  { id: "registration", label: "Registration", href: "/ops/event-studio/giveaway/registration" },
  { id: "audience", label: "Audience", href: "/ops/event-studio/giveaway/audience" },
  { id: "drawing", label: "Drawing", href: "/ops/event-studio/giveaway/drawing" },
  { id: "history", label: "History", href: "/ops/event-studio/giveaway/history" },
  { id: "settings", label: "Settings", href: "/ops/event-studio/giveaway/settings" },
];
