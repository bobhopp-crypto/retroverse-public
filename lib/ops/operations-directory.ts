/** Ops Console directory — classification and copy for the landing page. */

export type OpsToolStatus =
  | "ACTIVE"
  | "SUNDAY NIGHTS"
  | "IN PROGRESS"
  | "EXPERIMENTAL"
  | "ARCHIVE"
  | "PAUSED"
  | "UNKNOWN";

export type OpsDirectorySectionId =
  | "current"
  | "content"
  | "curation"
  | "labs"
  | "archive";

export type OpsDirectoryEntry = {
  id: string;
  name: string;
  href: string;
  description: string;
  purpose: string;
  status: OpsToolStatus;
  /** Opens in new tab (public routes). */
  external?: boolean;
};

export type OpsDirectorySection = {
  id: OpsDirectorySectionId;
  title: string;
  subtitle: string;
  entries: OpsDirectoryEntry[];
};

export type OpsQuickLink = {
  label: string;
  href: string;
  external?: boolean;
};

export const OPS_DIRECTORY_SECTIONS: OpsDirectorySection[] = [
  {
    id: "current",
    title: "Current Operations",
    subtitle: "Live event prep and day-to-day reconciliation.",
    entries: [
      {
        id: "sunday-nights",
        name: "Sunday Nights",
        href: "/ops/sunday-nights",
        description: "Prepare Sunday Nights live event feed.",
        purpose: "Go live, match RVTR, and drive the public Now Playing page.",
        status: "SUNDAY NIGHTS",
      },
      {
        id: "pass-generator",
        name: "Pass Generator",
        href: "/ops/passes",
        description: "Generate numbered collectible event passes.",
        purpose: "Print vintage door passes for hand-numbering at the pub.",
        status: "SUNDAY NIGHTS",
      },
      {
        id: "year-match",
        name: "Year Match Console",
        href: "/ops#year-match",
        description: "Match Billboard songs against owned playable media.",
        purpose: "Reconcile chart universe with VDJ library for the focus year.",
        status: "ACTIVE",
      },
      {
        id: "year-workspace-1967",
        name: "Year Workspace · 1967",
        href: "/ops/year/1967",
        description: "Review the 1967 video universe for event prep.",
        purpose: "Classify, tag, and connect owned media for the 1967 bank.",
        status: "IN PROGRESS",
      },
      {
        id: "year-workspace-1978",
        name: "Year Workspace · 1978",
        href: "/ops/year/1978",
        description: "Review the 1978 video universe for event prep.",
        purpose: "Classify, tag, and connect owned media for the 1978 bank.",
        status: "IN PROGRESS",
      },
      {
        id: "year-workspace-1992",
        name: "Year Workspace · 1992",
        href: "/ops/year/1992",
        description: "Review the 1992 video universe for event prep.",
        purpose: "Classify, tag, and connect owned media for the 1992 bank.",
        status: "IN PROGRESS",
      },
    ],
  },
  {
    id: "content",
    title: "Content & Acquisition",
    subtitle: "Library growth, sync, and album artwork pipelines.",
    entries: [
      {
        id: "acquisition",
        name: "Acquisition",
        href: "/ops/acquisition",
        description: "Track missing media and export acquisition worklists.",
        purpose: "Queue chart songs that need files before they can play.",
        status: "ACTIVE",
      },
      {
        id: "media-sync",
        name: "Media Sync",
        href: "/ops/media-sync",
        description: "Review VirtualDJ snapshot sync and metadata drift.",
        purpose: "Monitor new videos, metadata changes, and unmatched media.",
        status: "ACTIVE",
      },
      {
        id: "cover-review",
        name: "Cover Review",
        href: "/ops/review/covers",
        description: "Review cover integrity and acquisition candidate batches.",
        purpose: "Human QA for RV12 cover training and welcome-art acquisition.",
        status: "ACTIVE",
      },
      {
        id: "cover-backfill",
        name: "Cover Backfill",
        href: "/ops/covers/backfill",
        description: "Run automated cover backfill batches against the catalog.",
        purpose: "Batch-fill missing album artwork from trusted sources.",
        status: "ACTIVE",
      },
      {
        id: "cover-fix",
        name: "Cover Fix",
        href: "/ops/covers/corrections",
        description: "Apply operator cover corrections to album records.",
        purpose: "Promote reviewed fixes from helper batches into the graph.",
        status: "ACTIVE",
      },
    ],
  },
  {
    id: "curation",
    title: "Curation & Discovery",
    subtitle: "Tags, sets, crates, and show-flow tooling.",
    entries: [
      {
        id: "rvtags-review",
        name: "RV Tags Review",
        href: "/ops/rvtags-review/1967",
        description: "Review AI-generated tags before writing to VDJ.",
        purpose: "Approve Retroverse Tags per track for the focus year pilot.",
        status: "IN PROGRESS",
      },
      {
        id: "set-builder",
        name: "Set Builder",
        href: "/ops/show-builder",
        description: "Build Sunday show flow from MyLists and export playlists.",
        purpose: "Drag year lists into sets and export .vdjplaylist to VirtualDJ.",
        status: "ACTIVE",
      },
      {
        id: "crate-builder",
        name: "Crate Builder",
        href: "/ops/crate-builder",
        description: "Visually group MyList tracks into show crates.",
        purpose: "Explore and arrange owned media before set assembly.",
        status: "ACTIVE",
      },
      {
        id: "sorting-board",
        name: "Sorting Board",
        href: "/ops/year/1967/sorting",
        description: "Temporary tag-discovery board for pilot years.",
        purpose: "Sort and compare tracks while Retroverse Tags vocabulary stabilizes.",
        status: "IN PROGRESS",
      },
    ],
  },
  {
    id: "labs",
    title: "Labs & Experiments",
    subtitle: "Prototypes and evaluation — not required for tonight.",
    entries: [
      {
        id: "media-lab",
        name: "Media Lab",
        href: "/ops/media-lab",
        description: "Editorial clip review, harvest export, and timeline tools.",
        purpose: "Deep-cut video review workflow for long-form media prep.",
        status: "IN PROGRESS",
      },
      {
        id: "crossroads",
        name: "Crossroads",
        href: "/ops/crossroads",
        description: "Bridge discovery between VDJ universe and canonical graph.",
        purpose: "Explore connection paths across owned media and chart entities.",
        status: "EXPERIMENTAL",
      },
      {
        id: "healing",
        name: "Healing",
        href: "/ops/healing",
        description: "Album link recovery and degraded entity restoration.",
        purpose: "Evaluate and apply graph healing patterns with guardrails.",
        status: "EXPERIMENTAL",
      },
    ],
  },
  {
    id: "archive",
    title: "Archive / Legacy",
    subtitle: "Redirects and utilities kept for reference.",
    entries: [
      {
        id: "covers-redirect",
        name: "Covers (legacy redirect)",
        href: "/ops/covers",
        description: "Old /ops/covers path — redirects to Cover Review.",
        purpose: "Backward-compatible URL; use Cover Review instead.",
        status: "ARCHIVE",
      },
      {
        id: "covers-train-redirect",
        name: "Album Cover Check (legacy redirect)",
        href: "/ops/covers/train",
        description: "Old training entry — redirects to Cover Review.",
        purpose: "Backward-compatible URL; use Cover Review instead.",
        status: "ARCHIVE",
      },
      {
        id: "covers-embed",
        name: "Discogs Embed",
        href: "/ops/covers/embed",
        description: "Iframe utility for Discogs lookup during cover review.",
        purpose: "Support surface opened from cover workflows, not a standalone tool.",
        status: "ARCHIVE",
      },
    ],
  },
];

export const OPS_PUBLIC_QUICK_LINKS: OpsQuickLink[] = [
  { label: "Retroverse Home", href: "/", external: true },
  { label: "Sunday Nights", href: "/sunday-nights", external: true },
];

export const OPS_CONSOLE_QUICK_LINKS: OpsQuickLink[] = [
  { label: "Sunday Nights", href: "/ops/sunday-nights" },
  { label: "Pass Generator", href: "/ops/passes" },
  { label: "Year Workspace 1967", href: "/ops/year/1967" },
  { label: "Year Workspace 1978", href: "/ops/year/1978" },
  { label: "Year Workspace 1992", href: "/ops/year/1992" },
];

/** Routes that appear abandoned, unused, or superseded. */
export const OPS_LIKELY_ABANDONED_ROUTES: string[] = [
  "/ops/healing",
  "/ops/crossroads",
  "/ops/covers/embed",
  "/ops/covers",
  "/ops/covers/train",
  "/ops/year/[year]/sorting",
];

/** Recommended default top-level Ops tools (landing shortcuts). */
export const OPS_DEFAULT_TOP_TOOLS: string[] = [
  "Sunday Nights",
  "Pass Generator",
  "Year Match Console",
  "Year Workspace · 1967",
];

export function opsStatusTone(
  status: OpsToolStatus,
): "ok" | "warn" | "info" | "bad" | "dim" {
  switch (status) {
    case "ACTIVE":
      return "ok";
    case "SUNDAY NIGHTS":
      return "info";
    case "IN PROGRESS":
      return "warn";
    case "EXPERIMENTAL":
      return "info";
    case "ARCHIVE":
      return "dim";
    case "PAUSED":
      return "warn";
    default:
      return "dim";
  }
}
