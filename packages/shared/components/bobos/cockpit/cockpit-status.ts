import type { CockpitPanelData } from "@/lib/bobos/cockpit/load-panel-data";
import type { PanelDefinition, PanelStatus } from "@/lib/bobos/cockpit/types";

export type CockpitStatusTone = "gray" | "blue" | "green" | "amber" | "red" | "purple";
export type CockpitStatus = { tone: CockpitStatusTone; label: string };

const DEFAULT_TONES: Record<PanelStatus, CockpitStatusTone> = {
  nominal: "green",
  warning: "amber",
  alert: "red",
  offline: "gray",
};

export function cockpitStatus(definition: PanelDefinition, data: CockpitPanelData): CockpitStatus {
  if (definition.id === "live-display") return data.liveDisplay.channelRunning ? { tone: "green", label: "Running" } : { tone: "amber", label: "Waiting" };
  if (definition.id === "catalog-integrity") {
    if (data.catalogIntegrity.status === "Critical") return { tone: "red", label: "Action required" };
    if (data.catalogIntegrity.status === "Attention") return { tone: "amber", label: "Attention" };
    return { tone: "green", label: "Healthy" };
  }
  if (definition.id === "public-homepage") return data.publicHomepage.eventActive ? { tone: "purple", label: "Active" } : { tone: "blue", label: "Available" };
  if (definition.id === "pass-registration" && data.passRegistration.totalPasses === 0) return { tone: "gray", label: "No data" };
  return { tone: DEFAULT_TONES[definition.defaultStatus], label: definition.defaultStatus === "nominal" ? "Healthy" : definition.defaultStatus === "warning" ? "Warning" : definition.defaultStatus === "alert" ? "Error" : "Offline" };
}
