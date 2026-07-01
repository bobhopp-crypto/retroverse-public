import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PassStudioWorkspace } from "@/components/ops/event-studio/pass-studio/PassStudioWorkspace";
import { ensureDefaultPassTemplates } from "@/lib/ops/event-studio/pass-studio/default-templates";
import { loadPassLibrary, loadPassTemplates } from "@/lib/ops/event-studio/pass-studio/store";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pass Studio — BobOS",
  robots: { index: false, follow: false },
};

export default async function BobosPassesPage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const [binder, loadedTemplates, library] = await Promise.all([
    loadProductionBinder(),
    loadPassTemplates(),
    loadPassLibrary(),
  ]);

  // Pass Studio is a production checkpoint, not a template builder — never show
  // an empty "create one" state. Seed General/VIP/Backstage from Producer data.
  const templates = loadedTemplates.length > 0 ? loadedTemplates : await ensureDefaultPassTemplates(binder);

  return (
    <PassStudioWorkspace
      event={{
        eventName: binder.snapshot.eventName,
        venue: binder.snapshot.venue,
        date: binder.snapshot.date,
      }}
      initialTemplates={templates}
      initialLibrary={library}
    />
  );
}
