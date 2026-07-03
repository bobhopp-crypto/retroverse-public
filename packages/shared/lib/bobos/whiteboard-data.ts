import { stubBlueprint, type Blueprint } from "./blueprint-template";

export type PageStatus =
  | "not-started"
  | "designing"
  | "approved"
  | "building"
  | "production"
  | "retired";

export type TreeItem = {
  id: string;
  label: string;
  status: PageStatus;
};

export type TreeSection = {
  label: string;
  items: TreeItem[];
};

export type Decisions = {
  approved: string[];
  pending: string[];
  approvalLabel: string;
  isApproved: boolean;
};

export const STATUS_LABELS: Record<PageStatus, string> = {
  "not-started": "Not Started",
  designing: "Designing",
  approved: "Approved",
  building: "Building",
  production: "Production",
  retired: "Retired",
};

export const ARCHITECTURE_TREE: TreeSection[] = [
  {
    label: "PUBLIC RETROVERSE",
    items: [
      { id: "home", label: "Home", status: "approved" },
      { id: "search", label: "Search", status: "not-started" },
      { id: "song", label: "Song", status: "not-started" },
      { id: "artist", label: "Artist", status: "not-started" },
      { id: "album", label: "Album", status: "not-started" },
      { id: "year", label: "Year", status: "not-started" },
      { id: "live", label: "Live", status: "not-started" },
      { id: "charts", label: "Charts", status: "not-started" },
      { id: "experience", label: "Experience", status: "not-started" },
      { id: "registration", label: "Registration", status: "not-started" },
    ],
  },
  {
    label: "BOBOS PRIVATE",
    items: [
      { id: "video-library", label: "Video Library", status: "not-started" },
      { id: "retroverse", label: "Retroverse Graph", status: "not-started" },
      { id: "studio", label: "Studio", status: "not-started" },
      { id: "browser", label: "Browser", status: "not-started" },
      { id: "events", label: "Events", status: "not-started" },
      { id: "live-control", label: "Live Control", status: "not-started" },
      { id: "finance", label: "Finance", status: "not-started" },
      { id: "marketplace", label: "Marketplace", status: "not-started" },
      { id: "projects", label: "Projects", status: "not-started" },
      { id: "knowledge", label: "Knowledge", status: "not-started" },
    ],
  },
  {
    label: "BOBOS PLATFORM",
    items: [
      { id: "whiteboard", label: "Whiteboard", status: "production" },
      { id: "navigation-philosophy", label: "Navigation Philosophy", status: "approved" },
    ],
  },
];

export const BLUEPRINTS: Record<string, Blueprint> = {
  home: {
    title: "Home",
    purpose: "Public homepage for Retroverse.",
    primaryUser: "Anyone interested in music and pop culture.",
    mustAlwaysDo: ["Search", "Display content"],
    navigationIn: [
      "Direct URL (retroverse.live)",
      "QR codes and external links",
      "Return from any public page via logo/home",
    ],
    navigationOut: [
      "Search (always visible)",
      "Live display when active",
      "Entity pages via search and rotation",
      "Registration (optional, placement TBD)",
    ],
    displayPriority: [
      "Scheduled Announcement",
      "Live Broadcast",
      "Automatic Rotation",
    ],
    liveTrigger:
      "Automatic from VirtualDJ Bridge when Live Broadcast is enabled.",
    override: "VirtualDJ LIVE / PRIVATE switch.",
    notes: [
      "Visual style, mobile layout, and footer content deferred to implementation sprint.",
      "Architecture decisions approved — ready for build.",
    ],
    status: "approved",
  },

  search: stubBlueprint(
    "Search",
    "Canonical entity resolution first, connected graph expansion second.",
    "Patrons discovering artists, albums, tracks, and chart history.",
  ),

  song: stubBlueprint(
    "Song",
    "Track detail — RVTR identity, chart journey, playback, connected entities.",
    "Patrons who found a track and want depth.",
  ),

  artist: stubBlueprint(
    "Artist",
    "Canonical artist page — albums, dominant tracks, chart presence.",
    "Patrons exploring an artist's universe.",
  ),

  album: stubBlueprint(
    "Album",
    "Canonical album page — tracklist, artwork, release context.",
    "Patrons exploring a specific release.",
  ),

  year: stubBlueprint(
    "Year",
    "Year-in-review discovery — chart dominance and cultural moments.",
    "Patrons browsing by era.",
  ),

  live: stubBlueprint(
    "Live",
    "Patron-facing live broadcast experience when VirtualDJ is on air.",
    "Patrons watching or listening live.",
  ),

  charts: stubBlueprint(
    "Charts",
    "Chart history navigation — year, month, week, chart week, song.",
    "Patrons exploring Billboard and chart significance.",
  ),

  experience: stubBlueprint(
    "Experience",
    "Patron museum experience — immersive track/album presentation.",
    "Patrons who want a curated, emotional deep dive.",
  ),

  registration: stubBlueprint(
    "Registration",
    "Optional patron signup — placement and trigger TBD.",
    "Patrons who want to stay connected.",
  ),

  "video-library": stubBlueprint(
    "Video Library",
    "Owned video asset management — local files, R2 sync, queue status.",
    "Bob — operator managing media inventory.",
  ),

  retroverse: stubBlueprint(
    "Retroverse Graph",
    "Canonical graph curation — RVTR/RVAL/RVAR identity, tags, enrichment.",
    "Bob — operator maintaining canonical truth.",
  ),

  studio: stubBlueprint(
    "Studio",
    "Production pipeline — Collector, Editor, Director, Publisher.",
    "Bob — producer turning canonical identity into patron experiences.",
  ),

  browser: stubBlueprint(
    "Browser",
    "VirtualDJ library workbench — metadata, tags, RVTR matching, set prep.",
    "Bob — DJ / library curator.",
  ),

  events: stubBlueprint(
    "Events",
    "Live event production — scheduling, chapters, Sunday Nights, show prep.",
    "Bob — event producer.",
  ),

  "live-control": stubBlueprint(
    "Live Control",
    "Operator live switch — bridge status, broadcast enable, override.",
    "Bob — operator during a live show.",
  ),

  finance: stubBlueprint(
    "Finance",
    "Revenue, costs, reimbursements, and operational money tracking.",
    "Bob — operator managing Retroverse finances.",
  ),

  marketplace: stubBlueprint(
    "Marketplace",
    "Media and asset marketplace — future acquisition and licensing flows.",
    "Bob — operator sourcing assets.",
  ),

  projects: stubBlueprint(
    "Projects",
    "Sprint and milestone tracking — what is planned, approved, building.",
    "Bob — builder planning work.",
  ),

  knowledge: stubBlueprint(
    "Knowledge",
    "Institutional memory — decisions, timeline, docs, agent indexes.",
    "Bob — builder and future-you.",
  ),

  whiteboard: {
    title: "Whiteboard",
    purpose: "Architecture-first planning board — design before code.",
    primaryUser: "Bob — builder designing the system one page at a time.",
    mustAlwaysDo: [
      "Show full architecture tree",
      "Hold page blueprints",
      "Record approved and pending decisions",
      "Gate implementation until blueprint is approved",
    ],
    navigationIn: ["http://localhost:3000/bobos", "Local Studio Launcher (future link)"],
    navigationOut: [
      "Any page blueprint in the architecture tree",
      "Navigation Philosophy document",
    ],
    notes: [
      "Sprint 1 deliverable — static local data only.",
      "No persistence, no API, no AI.",
    ],
    status: "production",
  },

  "navigation-philosophy": {
    title: "Navigation Philosophy",
    purpose:
      "Rules for how patrons and operators move through Retroverse — documented before implementation.",
    primaryUser: "Bob and all future builders.",
    mustAlwaysDo: [
      "Resolve canonical entity first, expand connected universe second",
      "Search is always reachable on every public page",
      "Home never looks dead — one display area, always active content",
      "BobOS is localhost-only — never exposed on retroverse.live",
      "Products share data, not UI language",
      "Every feature maps to one architecture tree destination before building",
      "Whiteboard approval gates implementation — no surprise redesigns",
    ],
    navigationIn: [
      "BobOS Whiteboard (this document)",
      "Architecture tree → Navigation Philosophy",
    ],
    navigationOut: [
      "Public entity flow: Home → Search → Song ↔ Artist ↔ Album ↔ Year ↔ Charts",
      "Live mode overlays Home display priority when active",
      "BobOS entry: Local Launcher → Whiteboard / Studio / Browser / etc.",
    ],
    notes: [
      "Public Archive (retroverse.live) uses cream/paper collectible identity.",
      "BobOS private tools use product-specific themes — not Public Archive.",
      "Command Center and Local Launcher are entry points, not products.",
    ],
    status: "approved",
  },
};

export const PAGE_DECISIONS: Record<string, Decisions> = {
  home: {
    approved: [
      "Search is always visible.",
      "Homepage never looks dead.",
      "Registration is optional.",
      "Homepage owns exactly one display area.",
      "Scheduled content overrides Live.",
      "Live overrides Rotation.",
    ],
    pending: [
      "Registration placement",
      "Visual style",
      "Mobile behavior",
      "Footer content",
    ],
    approvalLabel: "Home Approved",
    isApproved: true,
  },
  "navigation-philosophy": {
    approved: [
      "Canonical entity resolution before keyword expansion.",
      "Public and BobOS private are separate surfaces.",
      "No feature without an architecture tree destination.",
      "Blueprint approval before implementation.",
    ],
    pending: [],
    approvalLabel: "Navigation Philosophy Approved",
    isApproved: true,
  },
};

export const DEFAULT_SELECTED_ID = "home";

export const WHITEBOARD_META = {
  title: "BobOS Whiteboard",
  subtitle: "Architecture First · No Code · One Decision At A Time",
  currentProduct: "Retroverse Public Experience",
  currentSprint: "Sprint 1 — Architecture Whiteboard",
  sprintStatus: "Complete",
  nextMilestone: "Sprint 2 — Design Search Blueprint",
};

/** Sprint 1 completion checklist — all must be true. */
export const SPRINT_1_DELIVERABLES = [
  { label: "BobOS Whiteboard (/bobos)", done: true },
  { label: "Architecture tree for every major BobOS area", done: true },
  { label: "Blueprint template established", done: true },
  { label: "Homepage blueprint approved", done: true },
  { label: "Navigation philosophy documented", done: true },
  { label: "Every future feature has a clear destination", done: true },
] as const;
