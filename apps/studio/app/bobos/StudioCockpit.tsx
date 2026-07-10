"use client";

import { BobosCockpit } from "@/components/bobos/cockpit/BobosCockpit";
import type { CockpitPanelData } from "@/lib/bobos/cockpit/load-panel-data";
import type { CockpitState } from "@/lib/bobos/cockpit/types";
import type { Project } from "@/lib/bobos/project-zero/types";

import { RetroverseRuntimePanel } from "./runtime/RetroverseRuntimePanel";

type Props = {
  initialState: CockpitState;
  projects: Project[];
  panelData: CockpitPanelData;
};

function renderStudioPanel(id: string) {
  if (id === "retroverse-runtime") return <RetroverseRuntimePanel compact />;
  return null;
}

export function StudioCockpit({ initialState, projects, panelData }: Props) {
  return (
    <BobosCockpit
      initialState={initialState}
      projects={projects}
      panelData={panelData}
      renderAppPanel={renderStudioPanel}
    />
  );
}
