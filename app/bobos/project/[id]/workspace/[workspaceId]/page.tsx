import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BobosPassWorkspace } from "@/components/bobos/pass-workspace/BobosPassWorkspace";
import { WorkspaceControls } from "@/components/bobos/project-zero/WorkspaceControls";
import { loadPassWorkspaceData } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import { getProject } from "@/lib/bobos/project-zero/store";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

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
    const { templates, library } = await loadPassWorkspaceData(project.id, project.sharedContext);
    return (
      <BobosPassWorkspace
        projectId={project.id}
        context={project.sharedContext}
        initialTemplates={templates}
        initialLibrary={library}
      />
    );
  }

  return (
    <main className="pz-workspace">
      <Link href={`/bobos/project/${project.id}`} className="pz-workspace__back">
        ← Return to Project
      </Link>

      <h1 className="pz-workspace__title">{workspace.title.toUpperCase()} WORKSPACE</h1>
      <p className="pz-workspace__note">
        This capability isn&apos;t wired up yet — Project Zero proves the navigation model only.
      </p>

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
