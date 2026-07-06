import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudioCockpit } from "./StudioCockpit";
import { loadCockpitPanelData } from "@/lib/bobos/cockpit/load-panel-data";
import { loadCockpitState } from "@/lib/bobos/cockpit/store";
import { listProjects } from "@/lib/bobos/project-zero/store";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const metadata: Metadata = {
  title: "BobOS Cockpit",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BobosPage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const [state, projects, panelData] = await Promise.all([
    loadCockpitState(),
    listProjects(),
    loadCockpitPanelData(),
  ]);

  return <StudioCockpit initialState={state} projects={projects} panelData={panelData} />;
}
