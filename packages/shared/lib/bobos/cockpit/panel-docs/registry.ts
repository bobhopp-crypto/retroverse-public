import type { PanelTypeId } from "../types";
import { CURRENT_EVENT_DOCS } from "./panels/current-event";
import { EVENT_PRODUCER_DOCS } from "./panels/event-producer";
import { PASS_MANAGEMENT_DOCS } from "./panels/pass-management";
import { PASS_PRODUCTION_DOCS } from "./panels/pass-production";
import type { PanelDocumentation } from "./types";

/**
 * Panel documentation registry.
 * Add a panel by creating panels/<id>.ts and registering it here.
 */
const PANEL_DOCUMENTATION: Partial<Record<PanelTypeId, PanelDocumentation>> = {
  "current-event": CURRENT_EVENT_DOCS,
  "event-producer": EVENT_PRODUCER_DOCS,
  "pass-production": PASS_PRODUCTION_DOCS,
  "pass-management": PASS_MANAGEMENT_DOCS,
};

export function getPanelDocumentation(panelType: PanelTypeId): PanelDocumentation | null {
  return PANEL_DOCUMENTATION[panelType] ?? null;
}

export function listDocumentedPanels(): PanelDocumentation[] {
  return Object.values(PANEL_DOCUMENTATION).filter(Boolean) as PanelDocumentation[];
}

export function hasPanelDocumentation(panelType: PanelTypeId): boolean {
  return panelType in PANEL_DOCUMENTATION;
}
