/** Canonical BobOS Cockpit panel registry. */
import {
  PANEL_LIBRARY as COCKPIT_PANEL_REGISTRY,
  PANEL_LIBRARY_GROUPS as COCKPIT_PANEL_GROUPS,
  panelsInGroup,
  getPanelDefinition,
  COCKPIT_COMMAND_BAR,
} from "./panel-library";

export { COCKPIT_PANEL_REGISTRY, COCKPIT_PANEL_GROUPS, panelsInGroup, getPanelDefinition, COCKPIT_COMMAND_BAR };

import { RV_REGISTRY } from "../rv-registry";
import type { PanelDefinition, PanelTypeId } from "./types";

export type CockpitPanelRegistryEntry = PanelDefinition & {
  category: string;
  rvId: string | null;
  description: string;
  component: PanelTypeId;
  defaultVisible: boolean;
  favorite: boolean;
};

const canonicalRvFor = (id: PanelTypeId) => RV_REGISTRY.find((entry) => entry.panelType === id && /^RV\d{2}-\d{2}$/.test(entry.id)) ?? null;

export function getCockpitPanelRegistryEntry(id: PanelTypeId): CockpitPanelRegistryEntry {
  const panel = COCKPIT_PANEL_REGISTRY[id];
  const canonicalRv = canonicalRvFor(id);
  return {
    ...panel,
    category: canonicalRv?.category ?? "UNASSIGNED",
    rvId: canonicalRv?.id ?? null,
    description: panel.description ?? panel.summary,
    component: panel.component ?? id,
    defaultVisible: panel.defaultVisible ?? true,
    favorite: panel.favorite ?? false,
  };
}

export function cockpitPanelRegistryEntries(): CockpitPanelRegistryEntry[] {
  return (Object.keys(COCKPIT_PANEL_REGISTRY) as PanelTypeId[]).map(getCockpitPanelRegistryEntry);
}
