import type { EventStudioCreateTool, EventStudioNavItem, EventStudioWorkflowItem } from "./types";
import { plannedGeneratorHref } from "./planned-generators";

export const EVENT_STUDIO_NAV: EventStudioNavItem[] = [
  { id: "overview", label: "Overview", href: "/ops/event-studio" },
  { id: "identity", label: "Identity", href: "/ops/event-studio/identity" },
  { id: "assets", label: "Assets", href: "/ops/event-studio/assets" },
  { id: "create", label: "Create", href: "/ops/event-studio/create" },
  { id: "publish", label: "Publish", href: "/ops/event-studio/publish" },
  { id: "giveaway", label: "Giveaway", href: "/ops/event-studio/giveaway" },
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
    href: plannedGeneratorHref("poster"),
    status: "planned",
  },
  {
    id: "facebook",
    title: "Generate Facebook Graphic",
    description: "Facebook event cover and share graphics.",
    href: plannedGeneratorHref("facebook"),
    status: "planned",
  },
  {
    id: "landing",
    title: "Generate Landing Page",
    description: "Public event landing hero and programming blocks.",
    href: plannedGeneratorHref("landing-page"),
    status: "planned",
  },
  {
    id: "blog",
    title: "Generate Blog Article",
    description: "Editorial write-up for the event theme.",
    href: plannedGeneratorHref("blog"),
    status: "planned",
  },
  {
    id: "registration",
    title: "Generate Registration Page",
    description: "QR registration and pass signup flow.",
    href: plannedGeneratorHref("registration"),
    status: "planned",
  },
  {
    id: "social",
    title: "Generate Social Images",
    description: "Instagram squares, stories, and carousel frames.",
    href: plannedGeneratorHref("social"),
    status: "planned",
  },
  {
    id: "qr",
    title: "Generate QR Artwork",
    description: "Standalone QR art for print and signage.",
    href: plannedGeneratorHref("qr"),
    status: "planned",
  },
  {
    id: "prize",
    title: "Generate Prize Graphics",
    description: "Giveaway prize cards and winner reveal art.",
    href: plannedGeneratorHref("prize"),
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
    href: plannedGeneratorHref("facebook"),
  },
  {
    id: "instagram",
    title: "Instagram",
    description: "Publish square and story assets to social channels.",
    href: plannedGeneratorHref("social"),
  },
  {
    id: "printables",
    title: "Printable Assets",
    description: "Download passes, posters, and table cards for the venue.",
    href: "/ops/event-studio/create/pass-generator",
  },
  {
    id: "download",
    title: "Download Package",
    description: "One-click export bundle for the full event production kit.",
    href: "/ops/content-creator",
  },
  {
    id: "export",
    title: "Export Assets",
    description: "Ship approved artwork to downstream systems.",
    href: "/ops/event-studio/assets",
  },
];

export const EVENT_STUDIO_AUDIENCE_ITEMS: EventStudioWorkflowItem[] = [
  {
    id: "registrations",
    title: "Pass Registrations",
    description: "Door pass sign-ups from the event landing page.",
    href: "/ops/event-studio/giveaway/audience",
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
    href: "/ops/event-studio/giveaway/audience",
  },
  {
    id: "drawing",
    title: "Drawing",
    description: "Run the live prize drawing from approved entries.",
    href: "/ops/event-studio/giveaway/drawing",
  },
  {
    id: "winner",
    title: "Winner",
    description: "Record and publish the giveaway winner.",
    href: "/ops/event-studio/giveaway/history",
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
  { label: "Event Producer", href: "/ops/event-studio/producer" },
  { label: "Generate Passes", href: "/ops/event-studio/create/pass-generator" },
  { label: "Generate Poster", href: plannedGeneratorHref("poster") },
  { label: "Generate Facebook", href: plannedGeneratorHref("facebook") },
  { label: "Generate Landing Page", href: plannedGeneratorHref("landing-page") },
  { label: "Registration", href: "/ops/event-studio/giveaway/audience" },
  { label: "Pass Generator", href: "/ops/event-studio/create/pass-generator" },
  { label: "Collectible Library", href: "/ops/content-creator" },
  { label: "Event Control", href: "/ops/event-control" },
] as const;
