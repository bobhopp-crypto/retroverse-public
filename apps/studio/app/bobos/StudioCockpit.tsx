"use client";

import { BobosCockpit } from "@/components/bobos/cockpit/BobosCockpit";
import type { CockpitPanelData } from "@/lib/bobos/cockpit/load-panel-data";
import type { CockpitState } from "@/lib/bobos/cockpit/types";
import type { Project } from "@/lib/bobos/project-zero/types";

import { CatalogIntegrityPanel } from "./CatalogIntegrityPanel";
import { RetroverseRuntimePanel } from "./runtime/RetroverseRuntimePanel";
import Link from "next/link";

type Props = {
  initialState: CockpitState;
  projects: Project[];
  panelData: CockpitPanelData;
};

function renderStudioPanel(id: string, panelData: CockpitPanelData) {
  if (id === "catalog-integrity") return <CatalogIntegrityPanel data={panelData.catalogIntegrity} />;
  if (id === "retroverse-runtime") return <RetroverseRuntimePanel compact />;
  if (id === "graph-bridge") return <div style={{ display: "grid", gap: "0.5rem" }}><strong>Idle · Read-only</strong><span>Bridge integrity: report-backed</span><span>Last audit: 2026-07-16</span><Link href="/ops/graph-bridge">Open Workspace</Link></div>;
  if (id === "six-up-viewer") return <div style={{ display: "grid", gap: "0.5rem" }}><strong>6-Up Viewer</strong><span>Six connected Retroverse experiences.</span><Link href="/review/public-v3">Open 6-Up Viewer</Link></div>;
  return null;
}

export function StudioCockpit({ initialState, projects, panelData }: Props) {
  return (
    <BobosCockpit
      initialState={initialState}
      projects={projects}
      panelData={panelData}
      renderAppPanel={(id) => renderStudioPanel(id, panelData)}
    />
  );
}
