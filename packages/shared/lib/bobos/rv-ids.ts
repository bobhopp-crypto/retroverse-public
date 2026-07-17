/** Compatibility helpers. The RV Registry is the only source of RV metadata. */
import type { PanelTypeId } from "@/lib/bobos/cockpit/types";
import { RV_REGISTRY, type RvCategoryId, type RvRegistryEntry } from "./rv-registry";

export const RV_ID_STORAGE_KEY = "bobos.showRvIds";
export type RvId = RvRegistryEntry["id"];
export type RvDomainId = RvCategoryId;
export type RvIdEntry = RvRegistryEntry & { domain: RvCategoryId; displayName: string; href?: string };
export const RV_ID_REGISTRY: readonly RvIdEntry[] = RV_REGISTRY.map((entry) => ({ ...entry, domain: entry.category, displayName: entry.title, href: entry.route ?? undefined }));

const normalize = (value: string) => { const path = value.split("#")[0]?.split("?")[0] ?? value; return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path; };
const panelAliases: Partial<Record<PanelTypeId, RvId>> = { "print-queue": "RV02-03", "printer-panel": "RV02-03" };
export const getRvIdEntry = (id: RvId) => RV_ID_REGISTRY.find((entry) => entry.id === id);
export const getRvIdByHref = (href: string): RvId | null => RV_ID_REGISTRY.find((entry) => entry.route && normalize(entry.route) === normalize(href))?.id ?? null;
export const getRvIdByPanelType = (panelType: PanelTypeId): RvId | null => RV_REGISTRY.find((entry) => entry.panelType === panelType)?.id ?? panelAliases[panelType] ?? null;
export const getPanelRegistryLabel = (panelType: PanelTypeId, fallbackTitle: string) => { const id = getRvIdByPanelType(panelType); return (id && getRvIdEntry(id)?.title) ?? fallbackTitle; };
export const getRvIdByNavId = (navId: string): RvId | null => RV_REGISTRY.find((entry) => entry.navId === navId)?.id ?? null;
export const getRvIdByDirectoryId = (directoryId: string): RvId | null => RV_REGISTRY.find((entry) => entry.directoryId === directoryId)?.id ?? null;
export function getRvIdByPathname(pathname: string): RvId | null {
  const path = normalize(pathname);
  if (path === "/ops/event-studio/producer") return "RV02-02";
  return getRvIdByHref(path) ?? (path.startsWith("/ops/event-studio") ? "RV02-05" : null);
}
export function formatRvId(id: RvId | string): string { const normalized = id.trim().toUpperCase(); return normalized.replace(/^RV(?=\d)/, "RV "); }
