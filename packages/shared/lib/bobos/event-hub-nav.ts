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
    id: "registration",
    label: "Registration",
    description: "Door pass sign-ups and registration page configuration.",
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
  { id: "event", label: "Event Hub", href: "/bobos/event" },
  { id: "passes", label: "Design Builder", href: "/bobos/passes" },
  { id: "producer", label: "Producer", href: "/bobos/producer" },
  { id: "presentation", label: "Presentation Control", href: "/bobos/presentation" },
  { id: "bridge", label: "Bridge", href: "/bobos/bridge" },
  { id: "pipeline", label: "Pipeline", href: "/bobos/pipeline" },
  { id: "ai", label: "AI Usage", href: "/bobos/ai" },
] as const;
