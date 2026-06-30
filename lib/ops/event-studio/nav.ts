import type { EventStudioNavItem, EventStudioToolCard } from "./types";

export const EVENT_STUDIO_NAV: EventStudioNavItem[] = [
  { id: "overview", label: "Overview", href: "/ops/event-studio" },
  { id: "branding", label: "Branding", href: "/ops/event-studio/branding" },
  { id: "print", label: "Print", href: "/ops/event-studio/print" },
  { id: "digital", label: "Digital", href: "/ops/event-studio/digital" },
  { id: "giveaway", label: "Giveaway", href: "/ops/event-studio/giveaway" },
  { id: "assets", label: "Assets", href: "/ops/event-studio/assets" },
  { id: "ai", label: "AI", href: "/ops/event-studio/ai" },
  { id: "settings", label: "Settings", href: "/ops/event-studio/settings" },
];

export const EVENT_STUDIO_PRINT_TOOLS: EventStudioToolCard[] = [
  {
    id: "pass-generator",
    title: "Pass Generator",
    description: "Create collectible event passes with QR export and print sheets.",
    href: "/ops/event-studio/print/pass-generator",
    status: "active",
    badge: "Ready",
  },
  {
    id: "poster",
    title: "Poster",
    description: "Event poster artwork — coming soon.",
    status: "planned",
    badge: "Soon",
  },
  {
    id: "table-cards",
    title: "Table Cards",
    description: "On-table signage for the venue — coming soon.",
    status: "planned",
    badge: "Soon",
  },
  {
    id: "certificates",
    title: "Certificates",
    description: "Award and giveaway certificates — coming soon.",
    status: "planned",
    badge: "Soon",
  },
];

export const EVENT_STUDIO_DIGITAL_TOOLS: EventStudioToolCard[] = [
  {
    id: "landing-page",
    title: "Landing Page",
    description: "Public event landing page and hero programming.",
    href: "/ops/event-control",
    status: "planned",
    badge: "Event Control",
  },
  {
    id: "facebook",
    title: "Facebook",
    description: "Facebook event graphics and copy blocks.",
    status: "planned",
    badge: "Soon",
  },
  {
    id: "instagram",
    title: "Instagram",
    description: "Instagram posts, stories, and carousel assets.",
    status: "planned",
    badge: "Soon",
  },
  {
    id: "now-playing",
    title: "Now Playing",
    description: "Live now-playing cards for screens and social.",
    status: "planned",
    badge: "Soon",
  },
  {
    id: "registration",
    title: "Registration",
    description: "QR registration and pass signup flows.",
    status: "planned",
    badge: "Soon",
  },
];
