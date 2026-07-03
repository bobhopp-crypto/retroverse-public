import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BobosPageHeader } from "@/components/bobos/BobosPageHeader";
import { BobosPassWorkspace } from "@/components/bobos/pass-workspace/BobosPassWorkspace";
import type { RvbrEraOption } from "@/components/bobos/pass-workspace/PassCreativeBrief";
import { WorkspaceControls } from "@/components/bobos/project-zero/WorkspaceControls";
import { loadPassWorkspaceData } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import { getProject } from "@/lib/bobos/project-zero/store";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

/** RVBR era options for the restored Content Creator's style selector. Tolerates an
 *  offline database — the workspace still opens; generation reports the real error. */
async function loadEraOptions(): Promise<RvbrEraOption[]> {
  try {
    const profiles = await listRvbrProfiles();
    return profiles.map((p) => ({
      slug: p.slug,
      name: p.name,
      years: `${p.eraStartYear}–${p.eraEndYear}`,
    }));
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace — BobOS",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string; workspaceId: string }>;
};

export default async function ProjectWorkspacePage({ params }: Props) {
  if (!shouldAllowOpsRoutes()) notFound();

  const { id, workspaceId } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const workspace = project.workspaces.find((w) => w.id === workspaceId);
  if (!workspace) notFound();

  if (workspace.id === "passes") {
    const { templates, library, creative, productionLayouts, printSheetGrid, nextSerial } =
      await loadPassWorkspaceData(project.id, project.sharedContext);
    const eras = await loadEraOptions();
    return (
      <BobosPassWorkspace
        projectId={project.id}
        context={project.sharedContext}
        initialTemplates={templates}
        initialLibrary={library}
        initialCreative={creative}
        initialProductionLayouts={productionLayouts}
        initialPrintSheetGrid={printSheetGrid}
        initialNextSerial={nextSerial}
        eras={eras}
      />
    );
  }

  return (
    <main className="bobos-page pz-workspace">
      <BobosPageHeader
        page={`${workspace.title} Workspace`}
        subtitle="This capability isn't wired up yet — Project Zero proves the navigation model only."
        eventName={project.title}
        breadcrumb={{ label: "Return to Project", href: `/bobos/project/${project.id}` }}
      />

      <section className="pz-workspace__context" aria-label="Shared context">
        <h2 className="pz-project__section-title">Shared Context</h2>
        <dl className="pz-project__context-grid">
          <div>
            <dt>Title</dt>
            <dd>{project.sharedContext.title}</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{project.sharedContext.description}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{project.sharedContext.venue || "—"}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{project.sharedContext.date || "—"}</dd>
          </div>
          <div>
            <dt>Series</dt>
            <dd>{project.sharedContext.series || "—"}</dd>
          </div>
          <div>
            <dt>Theme</dt>
            <dd>{project.sharedContext.theme || "—"}</dd>
          </div>
          <div>
            <dt>Colors</dt>
            <dd>{project.sharedContext.colors || "—"}</dd>
          </div>
        </dl>
      </section>

      <WorkspaceControls
        projectId={project.id}
        workspaceId={workspace.id}
        status={workspace.status}
        notes={workspace.notes}
      />
    </main>
  );
}
