import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PassStudioWorkspace } from "@/components/bobos/pass-studio/PassStudioWorkspace";
import { loadPassWorkspaceProductionLayouts } from "@/lib/bobos/project-zero/pass-workspace-store";
import { designBuilderProjectId } from "@/lib/bobos/pass-studio/design-builder-workspace";
import { ensureDefaultPassTemplates } from "@/lib/bobos/pass-studio/default-templates";
import { loadPassLibrary, loadPassTemplates, nextSerialStart } from "@/lib/bobos/pass-studio/store";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";
import { loadContentCreatorEras } from "@/lib/ops/content-creator/load-era-options";

import "../../ops/content-creator/content-creator.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design Builder — BobOS",
  robots: { index: false, follow: false },
};

export default async function BobosPassesPage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const [binder, loadedTemplates, library, eras] = await Promise.all([
    loadProductionBinder(),
    loadPassTemplates(),
    loadPassLibrary(),
    loadContentCreatorEras(),
  ]);

  // Pass Studio is a production checkpoint, not a template builder — never show
  // an empty "create one" state. Seed the standard General/VIP/Backstage slots.
  const templates = loadedTemplates.length > 0 ? loadedTemplates : await ensureDefaultPassTemplates(binder);
  const projectId = designBuilderProjectId(binder.snapshot.eventName);
  const [productionLayouts, nextSerial] = await Promise.all([
    loadPassWorkspaceProductionLayouts(projectId),
    nextSerialStart(),
  ]);

  return (
    <PassStudioWorkspace
      event={{
        eventName: binder.snapshot.eventName,
        venue: binder.snapshot.venue,
        date: binder.snapshot.date,
      }}
      initialTemplates={templates}
      initialLibrary={library}
      initialProductionLayouts={productionLayouts}
      initialNextSerial={nextSerial}
      eras={eras}
    />
  );
}
