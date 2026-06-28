import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DirectorWorkspaceView } from "@/components/ops/studio/director/workspace";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadDirectorWorkspaceSnapshot } from "@/lib/ops/studio/director/workspace/load-director-workspace";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../../director-workspace.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const snapshot = await loadDirectorWorkspaceSnapshot(rvtr);
  if (!snapshot) {
    return { title: "Director Workspace — Retroverse Studio" };
  }
  return {
    title: `${snapshot.title} — Director Workspace · Retroverse Studio`,
    robots: { index: false, follow: false },
  };
}

export default async function DirectorWorkspacePage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { rvtr } = await params;
  const snapshot = await loadDirectorWorkspaceSnapshot(rvtr);
  if (!snapshot) notFound();

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="director">
          <DirectorWorkspaceView snapshot={snapshot} />
        </StudioShell>
      </div>
    </main>
  );
}
