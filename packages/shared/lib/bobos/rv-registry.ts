import type { PanelTypeId } from "@/lib/bobos/cockpit/types";

export type RvStatus = "Active" | "Experimental" | "Hidden" | "Deprecated" | "Retired";
export type RvCategoryId = "RV00" | "RV01" | "RV02" | "RV03" | "RV04" | "RV05" | "RV06" | "RV07" | "RV08" | "RV09" | "RV10";

export type RvCategory = { id: RvCategoryId; title: string; description: string; accent: string };
export type RvRegistryEntry = {
  id: `RV${string}`;
  category: RvCategoryId;
  title: string;
  route: string | null;
  description: string;
  workspace: string;
  panelEligible: boolean;
  cockpitEligible: boolean;
  status: RvStatus;
  panelType?: PanelTypeId;
  navId?: string;
  directoryId?: string;
};

export const RV_CATEGORIES: readonly RvCategory[] = [
  { id: "RV00", title: "Platform", description: "Retroverse entrypoint, startup, and diagnostics.", accent: "#8d9aaa" },
  { id: "RV01", title: "Cockpit", description: "Dashboard, runtime, broadcast, and operations control.", accent: "#7896a8" },
  { id: "RV02", title: "Events", description: "Planning, passes, giveaway, and homepage operations.", accent: "#9b8c78" },
  { id: "RV03", title: "Music", description: "DJ, library, years, and music production workspaces.", accent: "#7f9a86" },
  { id: "RV04", title: "AI", description: "Packages, usage, and queues.", accent: "#9687a2" },
  { id: "RV05", title: "Live", description: "Public Retroverse Live surfaces.", accent: "#8b9b9b" },
  { id: "RV06", title: "Media", description: "Video, covers, and collections.", accent: "#9a887e" },
  { id: "RV07", title: "Finance", description: "Finance workspaces and reports.", accent: "#8c9b79" },
  { id: "RV08", title: "Marketplace", description: "Reserved marketplace workspace.", accent: "#989898" },
  { id: "RV09", title: "All-Star Baseball", description: "Living archive baseball workspace.", accent: "#9d876f" },
  { id: "RV10", title: "Shared Services", description: "Runtime, bridge, and shared operations services.", accent: "#82909e" },
] as const;

const e = (id: RvRegistryEntry["id"], category: RvCategoryId, title: string, route: string | null, description: string, workspace: string, options: Partial<Pick<RvRegistryEntry, "panelType" | "navId" | "directoryId" | "panelEligible" | "cockpitEligible" | "status">> = {}): RvRegistryEntry => ({
  id, category, title, route, description, workspace, panelEligible: Boolean(options.panelType) || options.panelEligible === true, cockpitEligible: Boolean(options.panelType) || options.cockpitEligible === true, status: options.status ?? (route ? "Active" : "Hidden"), ...options,
});

export const RV_REGISTRY: readonly RvRegistryEntry[] = [
  e("RV00-00", "RV00", "Retroverse", "/bobos/docs", "Platform documentation root — indexed BobOS panel manuals (cold-start remains tools/mac/RETROVERSE.command).", "Platform", { status: "Active", navId: "docs" }),
  e("RV01-01", "RV01", "BobOS Cockpit", "/bobos", "Primary BobOS command surface.", "Cockpit", { navId: "cockpit" }),
  e("RV01-02", "RV01", "Runtime", null, "Local service monitoring panel.", "Cockpit", { panelType: "retroverse-runtime" }),
  e("RV01-03", "RV01", "Broadcast Mixer", "/bobos/broadcast", "Four-input switcher controlling the retroverse.live audience output.", "Cockpit", { panelType: "broadcast", navId: "broadcast" }),
  e("RV01-20", "RV01", "The Booth", "/bobos/booth", "Retired — redirects to RV01-03 Broadcast Mixer.", "Cockpit", { status: "Retired", panelEligible: false, cockpitEligible: false }),
  e("RV01-21", "RV01", "Song Requests", "http://localhost:3000/bobos/song-requests", "Review and manage live audience requests.", "Cockpit", { panelType: "song-requests" }),
  e("RV01-04", "RV01", "VirtualDJ Bridge", "/bobos/bridge", "DJ bridge surface.", "Cockpit", { navId: "bridge" }),
  e("RV01-05", "RV01", "Operations Directory", "/ops", "Operations entrypoint.", "Operations", { panelType: "production-queue" }),
  e("RV01-06", "RV01", "Operations Hub", "/ops/hub", "Operations hub directory.", "Operations"),
  e("RV01-07", "RV01", "Retroverse Map", "/ops/map", "System map.", "Operations"),
  e("RV01-08", "RV01", "Sunday Nights Prep", "/ops/sunday-nights", "Event preparation workspace.", "Operations"),
  e("RV01-09", "RV01", "Event Command Center", "/ops/live", "Event command surface.", "Operations"),
  e("RV01-10", "RV01", "Live Control Center", "/ops/live-control", "Live control surface.", "Operations"),
  e("RV01-11", "RV01", "Live Companion", "/ops/live-companion", "Live companion surface.", "Operations"),
  e("RV01-12", "RV01", "Event Control", "/ops/event-control", "Event state control.", "Operations"),
  e("RV01-13", "RV01", "Presentation Control", "/bobos/presentation", "Presentation control surface.", "Cockpit"),
  e("RV01-14", "RV01", "Recovery Operations", "/ops/recovery", "Recovery directory.", "Operations"),
  e("RV01-15", "RV01", "Library Atlas", "/ops/infrastructure", "Infrastructure directory.", "Operations"),
  e("RV01-16", "RV01", "Continuity Audit", "/ops/continuity", "Continuity audit surface.", "Operations", { status: "Experimental" }),
  e("RV01-17", "RV01", "Graph Integrity", "/ops/integrity", "Integrity dashboard.", "Operations"),
  e("RV01-18", "RV01", "Atlas World", "/ops/atlas", "Atlas navigation surface.", "Operations"),
  e("RV01-19", "RV01", "Automation Factory", "/ops/automation-factory", "Automation workspace.", "Operations"),
  e("RVCR-100", "RV01", "Credentials", "/bobos/credentials", "AI Credential Studio", "Cockpit", { navId: "credentials", panelType: "credentials" }),
  e("RV02-01", "RV02", "Event Hub", "/bobos/event", "Shared event context.", "Events", { navId: "event", panelType: "current-event" }),
  e("RV02-02", "RV02", "Event Producer", "/bobos/producer", "Event production workspace.", "Events", { navId: "producer", panelType: "event-producer" }),
  e("RV02-03", "RV02", "Design Builder", "/bobos/passes", "Pass artwork and print production.", "Events", { navId: "passes", panelType: "pass-production" }),
  e("RV02-04", "RV02", "Pass Registration", "/bobos/pass-registration", "Retired — public claim is RV05-05 (/pass/[serial]); operator work is RV02-05 Pass Management.", "Events", { status: "Retired", panelEligible: false, cockpitEligible: false }),
  e("RV02-05", "RV02", "Pass Management", "/bobos/pass-management", "Operator panel for retroverse_passes / retroverse_visitors claim records.", "Events", { panelType: "pass-management", navId: "pass-management" }),
  e("RV02-06", "RV02", "Legacy Event Tools", "/ops/event-studio", "Legacy event tooling.", "Events", { status: "Deprecated", panelType: "event-studio" }),
  e("RV02-16", "RV02", "Content Creator (Passes)", "/ops/content-creator", "Pass content production.", "Events"),
  e("RV02-17", "RV02", "Show Builder", "/ops/show-builder", "Show assembly workspace.", "Events"),
  e("RV03-01", "RV03", "VirtualDJ Browser+", "/ops/browser-plus", "DJ browser surface.", "Music", { status: "Active" }),
  e("RV03-02", "RV03", "Browser+ 2.0", "/ops/browser-plus-2", "Next browser surface.", "Music", { status: "Experimental" }),
  e("RV03-03", "RV03", "Production Library", "/ops/library", "Music production library.", "Music"),
  e("RV03-04", "RV03", "Year Workspace", "/ops/year/[year]", "Year-based catalog workspace.", "Music", { panelType: "years" }),
  e("RV03-12", "RV03", "Artist Pipeline", "/bobos/pipeline", "Artist package pipeline.", "Music", { panelType: "artist-package" }),
  e("RV03-13", "RV03", "Song Package Pipeline", "/ops/studio", "Song package pipeline.", "Music", { panelType: "song-packages" }),
  e("RV03-14", "RV03", "6-Up Viewer", "/review/public-v3", "Review six connected Retroverse public experiences using one canonical song.", "Music", { panelType: "six-up-viewer", status: "Active" }),
  e("RV04-01", "RV04", "Song Packages Workbench", "/ops/intelligence", "Song package workbench.", "AI", { panelType: "current-song" }),
  e("RV04-03", "RV04", "Song Workspace", "/bobos/song-workspace", "The complete Retroverse workspace for one song — public experience preview, health, and next actions.", "AI", { panelType: "experience-inspector", status: "Experimental" }),
  e("RV04-06", "RV04", "AI Usage", "/bobos/ai", "AI usage surface.", "AI", { panelType: "ai-queue" }),
  e("RV05-01", "RV05", "Retroverse Live Site", "/", "Public live site.", "Public Live"), e("RV05-02", "RV05", "Retroverse Live Player", "/retroverse-live", "Public player.", "Public Live"), e("RV05-03", "RV05", "Sunday Nights Public", "/sunday-nights", "Public Sunday Nights surface.", "Public Live"), e("RV05-04", "RV05", "Now Playing Song", "/song/[rvtr]", "Public now-playing song.", "Public Live"), e("RV05-05", "RV05", "Pass Claim", "/pass/[serial]", "Public pass claim.", "Public Live"), e("RV05-06", "RV05", "Public Homepage", "/", "Public homepage panel.", "Public Live", { panelType: "public-homepage" }),
  e("RV06-01", "RV06", "Media Lab", "/ops/media-lab", "Media workspace.", "Media", { panelType: "media-library" }), e("RV06-02", "RV06", "Graph Bridge", "/ops/graph-bridge", "Read-only song-to-album relationship workspace.", "Graph Bridge", { panelType: "graph-bridge", navId: "graph-bridge" }), e("RV06-03", "RV06", "Cover Review", "/ops/review/covers", "Cover review.", "Media"),
  e("RV07-01", "RV07", "Finance Home", "/ops/finance", "Finance workspace.", "Finance"),
  e("RV08-00", "RV08", "Marketplace", null, "Reserved marketplace workspace.", "Marketplace", { status: "Hidden" }),
  e("RV09-01", "RV09", "Living Archive Dashboard", "/ops/allstar", "All-Star Baseball archive dashboard.", "All-Star Baseball"),
  e("RV10-01", "RV10", "Ops Gate / Site Mode", null, "Shared operations gate.", "Shared Services", { status: "Active" }), e("RV10-02", "RV10", "BobOS Runtime Service", null, "Shared runtime orchestration.", "Shared Services", { status: "Active" }), e("RV10-11", "RV10", "Pipeline Kernel", null, "Shared pipeline kernel.", "Shared Services", { status: "Active" }),
] as const;

export const RV_CATEGORY_BY_ID = Object.fromEntries(RV_CATEGORIES.map((category) => [category.id, category])) as Record<RvCategoryId, RvCategory>;
export const getRvEntry = (id: string) => RV_REGISTRY.find((entry) => entry.id === id);
export const getRvByPanelType = (panelType: PanelTypeId) => RV_REGISTRY.find((entry) => entry.panelType === panelType);
