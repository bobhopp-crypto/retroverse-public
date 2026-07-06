/** BobOS subsystem RV IDs — stable labels independent of display copy. */

import type { PanelTypeId } from "@/lib/bobos/cockpit/types";

export const RV_ID_STORAGE_KEY = "bobos.showRvIds";

export type RvId = `RV${string}`;

export type RvDomainId =
  | "RV00"
  | "RV01"
  | "RV02"
  | "RV03"
  | "RV04"
  | "RV05"
  | "RV06"
  | "RV07"
  | "RV08"
  | "RV09"
  | "RV10";

export type RvIdEntry = {
  id: RvId;
  domain: RvDomainId;
  displayName: string;
  href?: string;
  panelType?: PanelTypeId;
  navId?: string;
  directoryId?: string;
};

export const RV_ID_REGISTRY: readonly RvIdEntry[] = [
  { id: "RV00-00", domain: "RV00", displayName: "Retroverse" },

  { id: "RV01-01", domain: "RV01", displayName: "BobOS Cockpit", href: "/bobos", navId: "cockpit" },
  { id: "RV01-02", domain: "RV01", displayName: "Runtime", panelType: "retroverse-runtime" },
  { id: "RV01-03", domain: "RV01", displayName: "Broadcast Control", panelType: "broadcast" },
  { id: "RV01-04", domain: "RV01", displayName: "VirtualDJ Bridge", href: "/bobos/bridge", navId: "bridge" },
  { id: "RV01-05", domain: "RV01", displayName: "Operations Directory", href: "/ops", panelType: "production-queue" },
  { id: "RV01-06", domain: "RV01", displayName: "Operations Hub", href: "/ops/hub", directoryId: "operations-hub" },
  { id: "RV01-07", domain: "RV01", displayName: "Retroverse Map", href: "/ops/map" },
  { id: "RV01-08", domain: "RV01", displayName: "Sunday Nights Prep", href: "/ops/sunday-nights", directoryId: "sunday-nights" },
  { id: "RV01-09", domain: "RV01", displayName: "Event Command Center", href: "/ops/live", directoryId: "live-now-playing" },
  { id: "RV01-10", domain: "RV01", displayName: "Live Control Center", href: "/ops/live-control" },
  { id: "RV01-11", domain: "RV01", displayName: "Live Companion", href: "/ops/live-companion" },
  { id: "RV01-12", domain: "RV01", displayName: "Event Control", href: "/ops/event-control", directoryId: "event-control" },
  { id: "RV01-13", domain: "RV01", displayName: "Presentation Control", href: "/bobos/presentation", navId: "presentation" },
  { id: "RV01-14", domain: "RV01", displayName: "Recovery Operations", href: "/ops/recovery", directoryId: "recovery-ops" },
  { id: "RV01-15", domain: "RV01", displayName: "Library Atlas", href: "/ops/infrastructure", directoryId: "library-atlas" },
  { id: "RV01-19", domain: "RV01", displayName: "Automation Factory", href: "/ops/automation-factory" },

  { id: "RV02-01", domain: "RV02", displayName: "Event Hub", href: "/bobos/event", navId: "event", directoryId: "event-hub", panelType: "current-event" },
  { id: "RV02-02", domain: "RV02", displayName: "Event Producer", href: "/bobos/producer", navId: "producer" },
  { id: "RV02-03", domain: "RV02", displayName: "Design Builder", href: "/bobos/passes", navId: "passes", directoryId: "pass-generator", panelType: "pass-production" },
  { id: "RV02-04", domain: "RV02", displayName: "Pass Registrations", href: "/ops/pass-registrations", directoryId: "pass-registrations", panelType: "pass-registration" },
  { id: "RV02-05", domain: "RV02", displayName: "Legacy Event Tools", href: "/ops/event-studio", directoryId: "event-studio", panelType: "event-studio" },
  { id: "RV02-16", domain: "RV02", displayName: "Content Creator (Passes)", href: "/ops/content-creator", directoryId: "content-creator" },
  { id: "RV02-17", domain: "RV02", displayName: "Show Builder", href: "/ops/show-builder", directoryId: "set-builder" },

  { id: "RV03-01", domain: "RV03", displayName: "VirtualDJ Browser+", href: "/ops/browser-plus", panelType: "virtualdj-status" },
  { id: "RV03-02", domain: "RV03", displayName: "Browser+ 2.0", href: "/ops/browser-plus-2" },
  { id: "RV03-03", domain: "RV03", displayName: "Production Library", href: "/ops/library" },
  { id: "RV03-04", domain: "RV03", displayName: "Year Workspace", href: "/ops/year/1967", directoryId: "year-workspace-1967", panelType: "years" },
  { id: "RV03-12", domain: "RV03", displayName: "Artist Pipeline", href: "/bobos/pipeline", navId: "pipeline", panelType: "artist-package" },
  { id: "RV03-13", domain: "RV03", displayName: "Song Package Pipeline", href: "/ops/studio", panelType: "song-packages" },

  { id: "RV04-01", domain: "RV04", displayName: "Song Packages Workbench", href: "/ops/intelligence", directoryId: "intelligence-workbench", panelType: "current-song" },
  { id: "RV04-06", domain: "RV04", displayName: "AI Usage", href: "/bobos/ai", navId: "ai", panelType: "ai-queue" },

  { id: "RV05-01", domain: "RV05", displayName: "Retroverse Live Site", href: "/" },
  { id: "RV05-02", domain: "RV05", displayName: "Retroverse Live Player", href: "/" },
  { id: "RV05-03", domain: "RV05", displayName: "Public Audience", href: "/" },
  { id: "RV05-06", domain: "RV05", displayName: "Public Homepage", href: "/", panelType: "public-homepage" },

  { id: "RV06-01", domain: "RV06", displayName: "Media Lab", href: "/ops/media-lab", directoryId: "media-lab", panelType: "media-library" },
  { id: "RV06-02", domain: "RV06", displayName: "Media Collections", href: "/ops/media-collections", directoryId: "media-collections" },
  { id: "RV06-03", domain: "RV06", displayName: "Cover Review", href: "/ops/review/covers", directoryId: "cover-review" },

  { id: "RV07-01", domain: "RV07", displayName: "Finance Home", href: "/ops/finance" },

  { id: "RV09-01", domain: "RV09", displayName: "Living Archive Dashboard", href: "/ops/allstar" },
] as const;

const byHref = new Map<string, RvId>();
const byPanelType = new Map<PanelTypeId, RvId>();
const byNavId = new Map<string, RvId>();
const byDirectoryId = new Map<string, RvId>();
const byId = new Map<RvId, RvIdEntry>();

for (const entry of RV_ID_REGISTRY) {
  byId.set(entry.id, entry);
  if (entry.href) byHref.set(normalizeHref(entry.href), entry.id);
  if (entry.panelType) byPanelType.set(entry.panelType, entry.id);
  if (entry.navId) byNavId.set(entry.navId, entry.id);
  if (entry.directoryId) byDirectoryId.set(entry.directoryId, entry.id);
}

function normalizeHref(href: string): string {
  const path = href.split("#")[0]?.split("?")[0] ?? href;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function getRvIdEntry(id: RvId): RvIdEntry | undefined {
  return byId.get(id);
}

export function getRvIdByHref(href: string): RvId | null {
  return byHref.get(normalizeHref(href)) ?? null;
}

/** Panels that share an RV ID with another surface (e.g. multiple cockpit tiles → Design Builder). */
const PANEL_RV_ID: Partial<Record<PanelTypeId, RvId>> = {
  "print-queue": "RV02-03",
  "printer-panel": "RV02-03",
};

export function getRvIdByPanelType(panelType: PanelTypeId): RvId | null {
  return byPanelType.get(panelType) ?? PANEL_RV_ID[panelType] ?? null;
}

/** Registry display name when mapped; otherwise the panel library fallback title. */
export function getPanelRegistryLabel(panelType: PanelTypeId, fallbackTitle: string): string {
  const rvId = getRvIdByPanelType(panelType);
  const entry = rvId ? getRvIdEntry(rvId) : undefined;
  return entry?.displayName ?? fallbackTitle;
}

export function getRvIdByNavId(navId: string): RvId | null {
  return byNavId.get(navId) ?? null;
}

export function getRvIdByDirectoryId(directoryId: string): RvId | null {
  return byDirectoryId.get(directoryId) ?? null;
}

/** Path-specific RV IDs when href alone is ambiguous or nested under a legacy shell. */
const PATH_RV_ID: Record<string, RvId> = {
  "/ops/event-studio/producer": "RV02-02",
};

export function getRvIdByPathname(pathname: string): RvId | null {
  const normalized = normalizeHref(pathname);
  const pathOverride = PATH_RV_ID[normalized];
  if (pathOverride) return pathOverride;

  const fromHref = getRvIdByHref(normalized);
  if (fromHref) return fromHref;

  if (normalized.startsWith("/ops/event-studio")) return "RV02-05";

  return null;
}

/** Operator-facing display — space after RV distinguishes BobOS IDs from RVTR/RVAR/RVAL. */
export function formatRvId(id: RvId | string): string {
  const normalized = id.trim().toUpperCase();
  const match = /^RV(\d{2}-\d{2})$/.exec(normalized);
  if (match) return `RV ${match[1]}`;
  return normalized.replace(/^RV(?=\d)/, "RV ");
}
