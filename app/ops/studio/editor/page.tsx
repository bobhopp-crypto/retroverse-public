import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorLibraryHome } from "@/components/ops/studio/EditorLibraryHome";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadEditorLibraryIndex } from "@/lib/ops/studio/editor/load-library";
import { getStudioDepartment } from "@/lib/ops/studio/departments";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Story Desk — Editor",
  robots: { index: false, follow: false },
};

export default async function EditorLibraryPage() {
  if (!isOpsEnabled()) notFound();

  const dept = getStudioDepartment("editor");
  if (!dept) notFound();

  const index = await loadEditorLibraryIndex();

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="editor" lead={dept.mission}>
          <EditorLibraryHome index={index} />
        </StudioShell>
      </div>
    </main>
  );
}
