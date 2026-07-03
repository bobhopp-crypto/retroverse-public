import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BobosPageHeader } from "@/components/bobos/BobosPageHeader";
import { getProject } from "@/lib/bobos/project-zero/store";
import { WORKSPACE_STATUS_LABELS } from "@/lib/bobos/project-zero/types";
import { WORKSPACE_CATALOG } from "@/lib/bobos/project-zero/workspace-catalog";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project — BobOS",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
};

function statusClass(status: string): string {
  return `pz-card__status pz-card__status--${status.toLowerCase().replace(/_/g, "-")}`;
}

export default async function ProjectDashboardPage({ params }: Props) {
  if (!shouldAllowOpsRoutes()) notFound();

  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <main className="bobos-page pz-project">
      <BobosPageHeader
        page={project.title}
        subtitle={project.objective}
        breadcrumb={{ label: "BobOS Cockpit", href: "/bobos" }}
      />

      <section className="pz-project__context" aria-label="Shared context">
        <h2 className="pz-project__section-title">Shared Context</h2>
        <dl className="pz-project__context-grid">
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

      <section aria-label="Workspaces">
        <h2 className="pz-project__section-title">Workspaces</h2>
        <div className="pz-project__grid">
          {project.workspaces.map((workspace) => {
            const catalogEntry = WORKSPACE_CATALOG[workspace.id];
            const isExternal = Boolean(catalogEntry.existingHref);
            const href = catalogEntry.existingHref ?? `/bobos/project/${project.id}/workspace/${workspace.id}`;

            return (
              <article key={workspace.id} className="pz-card">
                <h3 className="pz-card__title">{workspace.title}</h3>
                <span className={statusClass(workspace.status)}>{WORKSPACE_STATUS_LABELS[workspace.status]}</span>
                {isExternal ? (
                  <a className="pz-card__open" href={href} target="_blank" rel="noopener noreferrer">
                    Open
                  </a>
                ) : (
                  <Link className="pz-card__open" href={href}>
                    Open
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
