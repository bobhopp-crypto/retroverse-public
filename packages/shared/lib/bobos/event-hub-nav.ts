export type BobosEventHubAction = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export const BOBOS_EVENT_HUB_ACTIONS: BobosEventHubAction[] = [
  {
    id: "producer",
    label: "Producer",
    description: "Describe the show once — passes, giveaway, and homepage flow from one plan.",
    href: "/bobos/producer",
  },
  {
    id: "passes",
    label: "Design Builder",
    description: "Build passes, credentials, posters, and print-ready visual assets.",
    href: "/bobos/passes",
  },
  {
    id: "giveaway",
    label: "Giveaway",
    description: "Prize drawing workspace and live show giveaway setup.",
    href: "/ops/event-studio/giveaway",
  },
  {
    id: "pass-management",
    label: "Pass Management",
    description: "Search, edit, reset, and manage permanent pass claims.",
    href: "/bobos/pass-management",
  },
  {
    id: "registration",
    label: "Giveaway Registration",
    description: "Giveaway registration page configuration.",
    href: "/ops/event-studio/giveaway/registration",
  },
  {
    id: "homepage",
    label: "Homepage Preview",
    description: "Sunday public homepage preview from the producer plan.",
    href: "/ops/event-studio/homepage",
  },
];

export const BOBOS_PRIMARY_NAV = [
  { id: "cockpit", label: "Cockpit", href: "/bobos" },
  { id: "credentials", label: "Credentials", href: "/bobos/credentials" },
  { id: "event", label: "Event Hub", href: "/bobos/event" },
  { id: "passes", label: "Design Builder", href: "/bobos/passes" },
  { id: "pass-management", label: "Pass Management", href: "/bobos/pass-management" },
  { id: "producer", label: "Producer", href: "/bobos/producer" },
  { id: "presentation", label: "Presentation Control", href: "/bobos/presentation" },
  { id: "booth", label: "Booth", href: "/bobos/booth" },
  { id: "bridge", label: "Bridge", href: "/bobos/bridge" },
  { id: "pipeline", label: "Pipeline", href: "/bobos/pipeline" },
  { id: "ai", label: "AI Usage", href: "/bobos/ai" },
] as const;
