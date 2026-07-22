/**
 * RV00-00 Panel Documentation index.
 *
 * Builds index rows from the RV registry + the typed panel-docs registry.
 * Single source of truth for manuals remains panel-docs/registry.ts —
 * this catalog only indexes; it does not duplicate content.
 */

import { RV_CATEGORY_BY_ID, RV_REGISTRY } from "@/lib/bobos/rv-registry";
import type { PanelTypeId } from "../types";
import { getPanelDocumentation } from "./registry";
import type { PanelVerificationStatus } from "./types";

export type PanelDocIndexRow = {
  rvId: string;
  panelType: PanelTypeId | null;
  title: string;
  categoryId: string;
  category: string;
  verificationStatus: PanelVerificationStatus | null;
  verifiedAt: string | null;
  documented: boolean;
  /** Full-page manual route when documented; otherwise null. */
  manualHref: string | null;
};

/** Canonical browser route for the RV00-00 panel documentation library. */
export const PANEL_DOCS_LIBRARY_HREF = "/bobos/docs";

export function panelManualHref(rvId: string): string {
  return `${PANEL_DOCS_LIBRARY_HREF}/${encodeURIComponent(rvId)}`;
}

function compareRvId(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Index of Cockpit-eligible panels for the RV00-00 documentation library.
 * Sorted by RV number. Undocumented panels appear as documented: false.
 */
export function buildPanelDocumentationIndex(): PanelDocIndexRow[] {
  const rows: PanelDocIndexRow[] = RV_REGISTRY.filter((entry) => entry.panelEligible && entry.panelType).map(
    (entry) => {
      const docs = entry.panelType ? getPanelDocumentation(entry.panelType) : null;
      return {
        rvId: entry.id,
        panelType: entry.panelType ?? null,
        title: entry.title,
        categoryId: entry.category,
        category: RV_CATEGORY_BY_ID[entry.category].title,
        verificationStatus: docs?.verification.status ?? null,
        verifiedAt: docs?.verification.verifiedAt ?? null,
        documented: Boolean(docs),
        manualHref: docs ? panelManualHref(entry.id) : null,
      };
    },
  );

  rows.sort((a, b) => compareRvId(a.rvId, b.rvId));
  return rows;
}

export function getPanelDocumentationByRvId(rvId: string) {
  const normalized = rvId.trim().toUpperCase().replace(/\s+/g, "");
  const entry = RV_REGISTRY.find((item) => item.id.toUpperCase() === normalized);
  if (!entry?.panelType) return null;
  return getPanelDocumentation(entry.panelType);
}
