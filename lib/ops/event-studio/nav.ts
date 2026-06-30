import type { EventStudioCreateTool, EventStudioNavItem, EventStudioWorkflowItem } from "./types";

export const EVENT_STUDIO_NAV: EventStudioNavItem[] = [
  { id: "overview", label: "Overview", href: "/ops/event-studio" },
  { id: "identity", label: "Identity", href: "/ops/event-studio/identity" },
  { id: "assets", label: "Assets", href: "/ops/event-studio/assets" },
  { id: "create", label: "Create", href: "/ops/event-studio/create" },
  { id: "publish", label: "Publish", href: "/ops/event-studio/publish" },
  { id: "audience", label: "Audience", href: "/ops/event-studio/audience" },
  { id: "archive", label: "Archive", href: "/ops/event-studio/archive" },
  { id: "settings", label: "Settings", href: "/ops/event-studio/settings" },
];

export const EVENT_STUDIO_CREATE_TOOLS: EventStudioCreateTool[] = [
  {
    id: "pass",
    title: "Generate Pass",
    description: "Collectible front/back pass artwork with QR export and print sheets.",
    href: "/ops/event-studio/create/pass-generator",
    status: "active",
  },
  {
    id: "poster",
    title: "Generate Poster",
    description: "Venue poster artwork inheriting event identity.",
    status: "planned",
  },
  {
    id: "facebook",
    title: "Generate Facebook Graphic",
    description: "Facebook event cover and share graphics.",
    status: "planned",
  },
  {
    id: "landing",
    title: "Generate Landing Page",
    description: "Public event landing hero and programming blocks.",
    status: "planned",
  },
  {
    id: "blog",
    title: "Generate Blog Article",
    description: "Editorial write-up for the event theme.",
    status: "planned",
  },
  {
    id: "registration",
    title: "Generate Registration Page",
    description: "QR registration and pass signup flow.",
    status: "planned",
  },
  {
    id: "social",
    title: "Generate Social Images",
    description: "Instagram squares, stories, and carousel frames.",
    status: "planned",
  },
  {
    id: "qr",
    title: "Generate QR Artwork",
    description: "Standalone QR art for print and signage.",
    status: "planned",
  },
  {
    id: "prize",
    title: "Generate Prize Graphics",
    description: "Giveaway prize cards and winner reveal art.",
    status: "planned",
  },
];

export const EVENT_STUDIO_PUBLISH_ITEMS: EventStudioWorkflowItem[] = [
  {
    id: "landing",
    title: "Landing Page",
    description: "Publish the public event page when hero and programming are approved.",
    href: "/ops/event-control",
  },
  {
    id: "facebook",
    title: "Facebook Post",
    description: "Push approved Facebook cover and event copy.",
  },
  {
    id: "instagram",
    title: "Instagram",
    description: "Publish square and story assets to social channels.",
  },
  {
    id: "printables",
    title: "Printable Assets",
    description: "Download passes, posters, and table cards for the venue.",
  },
  {
    id: "download",
    title: "Download Package",
    description: "One-click export bundle for the full event production kit.",
  },
  {
    id: "export",
    title: "Export Assets",
    description: "Ship approved artwork to downstream systems.",
  },
];

export const EVENT_STUDIO_AUDIENCE_ITEMS: EventStudioWorkflowItem[] = [
  {
    id: "registrations",
    title: "Pass Registrations",
    description: "Door pass sign-ups from the event landing page.",
    href: "/ops/pass-registrations",
  },
  {
    id: "emails",
    title: "Emails",
    description: "Event email list and outreach segments.",
  },
  {
    id: "prize-entries",
    title: "Prize Entries",
    description: "Giveaway entry tracking for live drawings.",
  },
  {
    id: "drawing",
    title: "Drawing",
    description: "Run the live prize drawing from approved entries.",
  },
  {
    id: "statistics",
    title: "Statistics",
    description: "Attendance, registrations, and engagement totals.",
  },
  {
    id: "winner",
    title: "Winner",
    description: "Record and publish the giveaway winner.",
  },
];

export const EVENT_STUDIO_ARCHIVE_EXAMPLES = [
  "Sunday Nights",
  "Live Aid",
  "Woodstock",
  "MTV Summer",
  "One Hit Wonders",
] as const;

export const EVENT_STUDIO_QUICK_ACTIONS = [
  { label: "Generate Passes", href: "/ops/event-studio/create/pass-generator" },
  { label: "Generate Poster", href: "/ops/event-studio/create" },
  { label: "Generate Facebook", href: "/ops/event-studio/create" },
  { label: "Generate Landing Page", href: "/ops/event-control" },
  { label: "Registration", href: "/ops/pass-registrations" },
  { label: "Pass Generator", href: "/ops/event-studio/create/pass-generator" },
  { label: "Collectible Library", href: "/ops/content-creator" },
] as const;
