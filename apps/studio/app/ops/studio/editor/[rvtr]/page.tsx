import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { EditorOfficeView } from "@/components/ops/studio/editor/EditorOfficeView";
import { EditorStoryMissing } from "@/components/ops/studio/EditorStoryMissing";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadEditorPackagePageContext } from "@/lib/ops/studio/editor/load-library";
import { getStudioDepartment } from "@/lib/ops/studio/departments";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

const getEditorPackagePageContext = cache(loadEditorPackagePageContext);

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const context = await getEditorPackagePageContext(rvtr);
  const label = context.collector
    ? `${context.collector.artist} — ${context.collector.title}`
    : rvtr.toUpperCase();

  return {
    title: `${label} — Editor`,
    robots: { index: false, follow: false },
  };
}

export default async function EditorStoryPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const dept = getStudioDepartment("editor");
  if (!dept) notFound();

  const { rvtr } = await params;
  const context = await getEditorPackagePageContext(rvtr);

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="editor" lead={dept.mission}>
          {context.collector && context.story && context.office ? (
            <EditorOfficeView key={context.rvtr} initialContext={context} />
          ) : (
            <EditorStoryMissing rvtr={context.rvtr} />
          )}
        </StudioShell>
      </div>
    </main>
  );
}
