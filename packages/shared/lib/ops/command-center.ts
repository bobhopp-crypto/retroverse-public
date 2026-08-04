/** Command Center 2.0 — single source for /ops launcher links and departments. */

import { PUBLIC_NAV_LINKS } from "@/lib/navigation/public-nav";

type PublicNavLink = (typeof PUBLIC_NAV_LINKS)[number];

export type CommandCenterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type CommandCenterPrimaryAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: "search" | "music" | "mic" | "art" | "database";
};

export type CommandCenterDepartment = {
  id: string;
  title: string;
  description: string;
  accent: string;
  links: CommandCenterLink[];
};

const publicLink = (id: PublicNavLink["id"]): CommandCenterLink => {
  const link = PUBLIC_NAV_LINKS.find((entry) => entry.id === id);
  if (!link) throw new Error(`Missing public nav link: ${id}`);
  return { label: link.label, href: link.href, external: true };
};

export const COMMAND_CENTER_PRIMARY_ACTIONS: CommandCenterPrimaryAction[] = [
  {
    id: "find-music",
    title: "Find Music",
    description: "Search songs, artists, albums, and more",
    href: "/search",
    icon: "search",
  },
  {
    id: "build-packages",
    title: "Build Song Packages",
    description: "Improve songs and create experiences",
    href: "/ops/library",
    icon: "music",
  },
  {
    id: "run-show",
    title: "Run Tonight's Show",
    description: "Go live and control the music",
    href: "/ops/sunday-nights",
    icon: "mic",
  },
  {
    id: "create-artwork",
    title: "Create Artwork",
    description: "Posters, passes, covers, and more",
    href: "/bobos/event",
    icon: "art",
  },
  {
    id: "manage-retroverse",
    title: "Manage Retroverse",
    description: "Data, scripts, and system tools",
    href: "/database-explorer",
    icon: "database",
  },
];

export const COMMAND_CENTER_DEPARTMENTS: CommandCenterDepartment[] = [
  {
    id: "core-production",
    title: "Core Production",
    description: "Build and maintain the Retroverse library.",
    accent: "#2A5BFF",
    links: [
      { label: "Song Package Pipeline", href: "/ops/studio" },
      { label: "Media Lab", href: "/bobos/media-lab" },
      { label: "Library", href: "/ops/library" },
      { label: "Research", href: "/ops/intelligence" },
      { label: "Event Hub", href: "/bobos/event" },
      { label: "Design Builder", href: "/bobos/passes" },
      { label: "Legacy Event Tools", href: "/ops/event-studio" },
      { label: "Content Creator", href: "/ops/content-creator" },
      { label: "Browser+ 2.0", href: "/ops/browser-plus-2" },
    ],
  },
  {
    id: "live-performance",
    title: "Live Performance",
    description: "Run shows and control live experiences.",
    accent: "#22C55E",
    links: [
      { label: "Run Show", href: "/ops/sunday-nights" },
      { label: "Live Control", href: "/ops/live-control" },
      { label: "Sunday Nights", href: "/ops/sunday-nights" },
      { label: "Live", href: "/ops/live" },
      { label: "VDJ Bridge", href: "/ops/live#bridge" },
      { label: "Event Control", href: "/ops/event-control" },
      { label: "Live Companion", href: "/ops/live-companion" },
    ],
  },
  {
    id: "curation-content",
    title: "Curation & Content",
    description: "Collect, edit, publish, and improve music content.",
    accent: "#F59E0B",
    links: [
      { label: "Collector", href: "/ops/studio/collector" },
      { label: "Editor", href: "/ops/studio/editor" },
      { label: "Publisher", href: "/ops/studio/publisher" },
      { label: "Story Builder", href: "/ops/studio/editor" },
      { label: "Experience Builder", href: "/ops/studio/experiences/chart-journey" },
      { label: "Cover Tools", href: "/ops/review/covers" },
    ],
  },
  {
    id: "historical-archive",
    title: "Historical Archive",
    description: "Explore Retroverse historical data.",
    accent: "#8B5CF6",
    links: [
      { label: "Artists", href: "/search" },
      { label: "Albums", href: "/search" },
      { label: "Years", href: "/rv/1984" },
      { label: "Charts", href: "/retroverse-2/charts" },
      { label: "Crossroads", href: "/ops/crossroads" },
      { label: "Media Collections", href: "/ops/media-collections" },
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    description: "System tools, data, and engineering utilities.",
    accent: "#14B8A6",
    links: [
      { label: "Database Explorer", href: "/database-explorer" },
      { label: "Architecture", href: "/ops/atlas/architecture" },
      { label: "System Map", href: "/ops/atlas/system" },
      { label: "Script Launcher", href: "/ops/atlas/scripts" },
      { label: "Diagnostics", href: "/diagnostics" },
      { label: "VirtualDJ Browser+", href: "/ops/browser-plus" },
    ],
  },
  {
    id: "operations-finance",
    title: "Operations & Finance",
    description: "Financial tools and operational reports.",
    accent: "#FACC15",
    links: [
      { label: "Finance", href: "/ops/finance" },
      { label: "Finance Import", href: "/ops/finance/import" },
      { label: "Reports", href: "/ops/finance/reports" },
      { label: "Statement Validation", href: "/ops/finance/statement-validation" },
      { label: "Recurring Monitor", href: "/ops/finance/reports/analytics" },
    ],
  },
];

/** Visible legacy entry — everything else lives in the collapsed drawer. */
export const COMMAND_CENTER_LEGACY_ENTRY: CommandCenterLink = {
  label: "Atlas Legacy",
  href: "/ops/atlas/legacy",
};

/** Long-tail tools preserved from the previous Command Center. */
export const COMMAND_CENTER_LEGACY_LINKS: CommandCenterLink[] = [
  { label: "All-Star Baseball", href: "/ops/allstar" },
  { label: "Scorebook", href: "/ops/allstar/scorebook" },
  { label: "Seasons", href: "/ops/allstar/seasons" },
  { label: "Stats", href: "/ops/allstar/stats" },
  { label: "Preserve", href: "/ops/allstar/preserve" },
  { label: "Review", href: "/ops/allstar/review" },
  { label: "Audit", href: "/ops/allstar/audit" },
  { label: "Research", href: "/ops/allstar/research" },
  { label: "Disc Library", href: "/ops/allstar/library" },
  { label: "Acquisition", href: "/ops/acquisition" },
  { label: "Automation Factory", href: "/ops/automation-factory" },
  { label: "Cover Backfill", href: "/ops/covers/backfill" },
  { label: "Cover Corrections", href: "/ops/covers/corrections" },
  { label: "Crate Builder", href: "/ops/crate-builder" },
  { label: "Show Builder", href: "/ops/show-builder" },
  { label: "Healing", href: "/ops/healing" },
  { label: "Media Lab", href: "/ops/media-lab" },
  { label: "Media Sync", href: "/ops/media-sync" },
  { label: "Pass Management", href: "/bobos/pass-management" },
  { label: "Experience Director Pilot", href: "/ops/experience-director-pilot" },
  { label: "Operations Hub", href: "/ops/hub" },
  { label: "Recovery Operations", href: "/ops/recovery" },
  { label: "Year Workspace 1967", href: "/ops/year/1967" },
  { label: "Year Workspace 1978", href: "/ops/year/1978" },
  { label: "Year Workspace 1992", href: "/ops/year/1992" },
  { label: "Creative Lab", href: "/ops/creative-lab" },
  { label: "Atlas Workshop", href: "/ops/atlas/workshop" },
  { label: "Atlas Encyclopedia", href: "/ops/atlas" },
  publicLink("home"),
  { label: "Live", href: "/retroverse-2/live", external: true },
];
