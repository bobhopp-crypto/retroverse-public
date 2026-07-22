import type { WorkshopRoom } from "./types";

export const WORKSHOP_ROOMS: WorkshopRoom[] = [
  {
    id: "shelf",
    title: "Shelf",
    status: "412 unmatched this week",
    tone: "shelf",
    tools: [
      { label: "Media Sync", href: "/ops/media-sync" },
      { label: "Year Match", href: "/ops#year-match" },
      { label: "Acquisition", href: "/ops/acquisition" },
    ],
  },
  {
    id: "missions",
    title: "Missions",
    status: "Rhiannon needs deploy",
    tone: "missions",
    tools: [
      { label: "1970s Territory", href: "/ops/atlas/1970s" },
      { label: "Year Workspace", href: "/ops/year/1967" },
      { label: "Cover Review", href: "/ops/review/covers" },
      { label: "Cover Backfill", href: "/ops/covers/backfill" },
      { label: "Cover Fix", href: "/ops/covers/corrections" },
    ],
  },
  {
    id: "show-prep",
    title: "Show Prep",
    status: "Next show in 4 days",
    tone: "prep",
    tools: [
      { label: "Set Builder", href: "/ops/show-builder" },
      { label: "Sunday Nights", href: "/ops/sunday-nights" },
    ],
  },
  {
    id: "event-desk",
    title: "Event Desk",
    status: "Homepage: Years mode",
    tone: "event",
    tools: [
      { label: "Event Control", href: "/ops/event-control" },
      { label: "Content Creator", href: "/ops/content-creator" },
      { label: "Pass Management", href: "/bobos/pass-management" },
    ],
  },
  {
    id: "create",
    title: "Create",
    status: "12 credentials in library",
    tone: "create",
    tools: [
      { label: "Content Creator", href: "/ops/content-creator" },
    ],
  },
  {
    id: "surgery",
    title: "Surgery",
    status: "Rare · gated",
    tone: "surgery",
    tools: [
      { label: "Healing", href: "/ops/healing" },
      { label: "Media Collections", href: "/ops/media-collections" },
      { label: "Media Lab", href: "/ops/media-lab" },
    ],
  },
];
